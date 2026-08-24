import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { getWordpressComOAuthConfig } from "@/infrastructure/config/wordpress-com-environment";
import {
  WORDPRESS_COM_STATE_COOKIE,
  exchangeWordpressComCode,
  parseStateCookie,
} from "@/lib/integrations/wordpress-com-oauth";
import { logger } from "@/infrastructure/observability/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Bước 2: WordPress.com chuyển người dùng về đây kèm ?code. Đối chiếu nonce
// trong cookie, đổi code lấy access token, mã hóa và lưu vào dự án. Lỗi được
// chuyển thành query param để hiện thông báo tiếng Việt trên trang dự án —
// không bao giờ ghi code/token vào URL, log hay thông báo.
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const state = parseStateCookie(
    cookieStore.get(WORDPRESS_COM_STATE_COOKIE)?.value,
  );
  const projectId = state?.projectId;
  const back = (params: Record<string, string>): NextResponse => {
    const target = new URL(
      projectId ? `/projects/${projectId}` : "/projects",
      url.origin,
    );
    for (const [key, value] of Object.entries(params)) {
      target.searchParams.set(key, value);
    }
    const response = NextResponse.redirect(target.toString(), 302);
    response.cookies.delete(WORDPRESS_COM_STATE_COOKIE);
    return response;
  };

  try {
    const identity = await requirePermission("project.update");

    // Người dùng bấm "Từ chối" ở màn hình duyệt của WordPress.com.
    if (url.searchParams.get("error")) {
      return back({ wpcom: "denied" });
    }
    const code = url.searchParams.get("code")?.trim();
    const returnedState = url.searchParams.get("state")?.trim();
    if (!state || !returnedState || returnedState !== state.nonce) {
      return back({ wpcom: "state_mismatch" });
    }
    if (!code) {
      return back({ wpcom: "missing_code" });
    }

    const current = await getProjectService().get(identity, state.projectId);
    const config = getWordpressComOAuthConfig();
    const token = await exchangeWordpressComCode({
      tokenEndpoint: config.tokenEndpoint,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      code,
    });

    const siteUrl =
      token.blog_url?.trim() ||
      current.integrations.wordpress.url ||
      current.website;

    await getProjectService().update(identity, state.projectId, {
      name: current.name,
      website: current.website,
      location: current.location ?? undefined,
      industry: current.industry ?? undefined,
      language: current.language,
      tone: current.tone,
      competitors: current.competitors.map((competitor) => ({
        domain: competitor.domain,
        title: competitor.title ?? undefined,
        notes: competitor.notes ?? undefined,
        priority: competitor.priority,
      })),
      wordpress: {
        url: siteUrl,
        // Site WordPress.com xác thực bằng token, không dùng username — giữ giá
        // trị cũ để hiển thị, mặc định là nhãn cho dễ nhận biết.
        username: current.integrations.wordpress.username || "wordpress.com",
        password: token.access_token,
      },
    });

    return back({ wpcom: "connected" });
  } catch (error) {
    logger.error(
      {
        projectId,
        err: error instanceof Error ? error.message : "unknown",
      },
      "wordpress.com oauth callback failed",
    );
    return back({ wpcom: "failed" });
  }
}

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ValidationError } from "@/domain/shared/app-error";
import { errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { getWordpressComOAuthConfig } from "@/infrastructure/config/wordpress-com-environment";
import {
  WORDPRESS_COM_STATE_COOKIE,
  stateCookieOptions,
} from "@/lib/integrations/wordpress-com-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Bước 1 của luồng "Kết nối WordPress.com": xác thực người dùng, kiểm tra dự án
// thuộc workspace, rồi chuyển hướng sang trang duyệt của WordPress.com. Nonce
// chống CSRF lưu trong cookie httpOnly và đối chiếu ở callback.
export async function GET(request: Request): Promise<Response> {
  try {
    const identity = await requirePermission("project.update");
    const projectId = new URL(request.url).searchParams.get("projectId")?.trim();
    if (!projectId) {
      throw new ValidationError(
        "PROJECT_ID_REQUIRED",
        "Thiếu projectId để kết nối WordPress.com.",
      );
    }
    // Ném NotFoundError nếu dự án không thuộc workspace của người dùng.
    await getProjectService().get(identity, projectId);

    const config = getWordpressComOAuthConfig();
    const nonce = randomUUID();
    const authorizeUrl = new URL(config.authorizationEndpoint);
    authorizeUrl.searchParams.set("client_id", config.clientId);
    authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("state", nonce);
    // Không đặt scope=global: token chỉ có quyền trên site người dùng chọn.

    const response = NextResponse.redirect(authorizeUrl.toString(), 302);
    response.cookies.set(
      WORDPRESS_COM_STATE_COOKIE,
      JSON.stringify({ nonce, projectId }),
      stateCookieOptions(),
    );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

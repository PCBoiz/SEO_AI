import type { NextRequest } from "next/server";
import { z } from "zod";
import { oauthProviderIds } from "@/domain/auth/oauth";
import { AppError } from "@/domain/shared/app-error";
import { logger } from "@/infrastructure/observability/logger";
import { getCurrentIdentity } from "@/lib/auth/dal";
import { completeOAuth } from "@/lib/auth/oauth.server";
import { xoaDemHieuQua } from "@/lib/seo/search-console.server";
import { xoaDemChiMuc } from "@/lib/seo/lap-chi-muc.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<Response> {
  const parsedProvider = z.enum(oauthProviderIds).safeParse((await params).provider);
  if (!parsedProvider.success) {
    return Response.redirect(new URL("/login?oauth_error=invalid_provider", request.url));
  }

  try {
    const identity = await getCurrentIdentity();
    const result = await completeOAuth(
      parsedProvider.data,
      request.nextUrl.searchParams,
      identity,
    );

    // ⚠️ XOÁ BỘ NHỚ ĐỆM SEARCH CONSOLE NGAY SAU KHI KẾT NỐI LẠI.
    //
    // Bộ đệm giữ kết quả 30 phút. Không xoá ở đây thì kịch bản thường gặp nhất
    // lại hỏng: người dùng thấy "không thấy property của website này", đi kết
    // nối bằng ĐÚNG tài khoản Google, quay về — và vẫn đọc y nguyên câu cũ,
    // trong nửa tiếng. Họ sẽ kết luận việc kết nối lại không ăn thua.
    //
    // Đệm chỉ nhớ kết quả thành công, nên trường hợp trên thực ra không bị kẹt.
    // Nhưng chiều ngược lại thì có: đổi sang tài khoản Google khác mà vẫn thấy
    // số của tài khoản cũ là sai thật, và sai một cách rất khó nghi ngờ.
    if (identity) {
      xoaDemHieuQua(identity.workspaceId);
      xoaDemChiMuc(identity.workspaceId);
    }

    return Response.redirect(new URL(result.redirectPath, request.url));
  } catch (error) {
    logger.warn(
      {
        provider: parsedProvider.data,
        errorCode: error instanceof AppError ? error.code : "OAUTH_CALLBACK_FAILED",
        errorType: error instanceof Error ? error.name : "unknown",
      },
      "OAuth callback failed",
    );
    const code = error instanceof AppError ? error.code.toLowerCase() : "callback_failed";
    const destination = (await getCurrentIdentity()) ? "/settings" : "/login";
    return Response.redirect(
      new URL(`${destination}?oauth_error=${encodeURIComponent(code)}`, request.url),
    );
  }
}

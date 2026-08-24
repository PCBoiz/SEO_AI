// Cookie state chống CSRF cho luồng OAuth WordPress.com. httpOnly nên script
// phía client không đọc được; sameSite "lax" vẫn gửi kèm khi WordPress.com
// chuyển hướng người dùng quay lại (điều hướng GET cấp cao nhất).

export const WORDPRESS_COM_STATE_COOKIE = "wpcom_oauth_state";

export function stateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 phút — đủ để duyệt, không để trôi nổi lâu.
  };
}

export interface WordpressComStatePayload {
  nonce: string;
  projectId: string;
}

export function parseStateCookie(
  raw: string | undefined,
): WordpressComStatePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WordpressComStatePayload>;
    if (
      typeof parsed.nonce !== "string" ||
      typeof parsed.projectId !== "string" ||
      parsed.nonce.length === 0 ||
      parsed.projectId.length === 0
    ) {
      return null;
    }
    return { nonce: parsed.nonce, projectId: parsed.projectId };
  } catch {
    return null;
  }
}

export interface WordpressComTokenResponse {
  access_token: string;
  blog_id?: string;
  blog_url?: string;
  token_type?: string;
}

// Đổi authorization code lấy access token. Client secret chỉ tồn tại phía
// server; token trả về được mã hóa vault trước khi lưu.
export async function exchangeWordpressComCode(params: {
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<WordpressComTokenResponse> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    code: params.code,
    grant_type: "authorization_code",
  });
  const response = await fetch(params.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `WordPress.com từ chối cấp token (HTTP ${response.status}): ${detail.slice(0, 200)}`,
    );
  }
  const payload = (await response.json()) as Partial<WordpressComTokenResponse>;
  if (typeof payload.access_token !== "string" || !payload.access_token) {
    throw new Error("WordPress.com không trả về access_token.");
  }
  return {
    access_token: payload.access_token,
    blog_id: typeof payload.blog_id === "string" ? payload.blog_id : undefined,
    blog_url: typeof payload.blog_url === "string" ? payload.blog_url : undefined,
    token_type: payload.token_type,
  };
}

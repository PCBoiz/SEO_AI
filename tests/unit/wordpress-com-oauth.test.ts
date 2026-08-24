import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildRedirectUri,
  getWordpressComOAuthConfig,
  isWordpressComOAuthConfigured,
} from "@/infrastructure/config/wordpress-com-environment";
import {
  exchangeWordpressComCode,
  parseStateCookie,
  stateCookieOptions,
} from "@/lib/integrations/wordpress-com-oauth";
import { ConfigurationError } from "@/domain/shared/app-error";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cấu hình OAuth WordPress.com", () => {
  const configured = {
    NEXT_PUBLIC_APP_URL: "https://app.example.com",
    WORDPRESS_COM_CLIENT_ID: "144802",
    WORDPRESS_COM_CLIENT_SECRET: "secret",
  };

  it("chỉ coi là đã cấu hình khi có đủ client id + secret", () => {
    expect(isWordpressComOAuthConfigured(configured)).toBe(true);
    expect(
      isWordpressComOAuthConfigured({
        ...configured,
        WORDPRESS_COM_CLIENT_SECRET: undefined,
      }),
    ).toBe(false);
    // Placeholder dạng <...> trong .env mẫu không được tính là đã cấu hình.
    expect(
      isWordpressComOAuthConfigured({
        ...configured,
        WORDPRESS_COM_CLIENT_ID: "<client-id>",
      }),
    ).toBe(false);
  });

  it("dựng redirect URI trỏ đúng route callback", () => {
    expect(buildRedirectUri("https://app.example.com")).toBe(
      "https://app.example.com/api/v1/integrations/wordpress-com/callback",
    );
    // Bỏ query/hash thừa để khớp tuyệt đối với URL đã đăng ký.
    expect(buildRedirectUri("https://app.example.com/abc?x=1#y")).toBe(
      "https://app.example.com/api/v1/integrations/wordpress-com/callback",
    );
  });

  it("từ chối app URL không phải HTTPS (trừ localhost)", () => {
    expect(() => buildRedirectUri("http://vidu.com")).toThrow(ConfigurationError);
    expect(buildRedirectUri("http://localhost:3000")).toContain("http://localhost:3000");
  });

  it("ném lỗi cấu hình rõ ràng khi thiếu biến môi trường", () => {
    expect(() =>
      getWordpressComOAuthConfig({ NEXT_PUBLIC_APP_URL: "https://app.example.com" }),
    ).toThrow(ConfigurationError);
  });
});

describe("cookie state chống CSRF", () => {
  it("httpOnly + sameSite lax + hết hạn ngắn", () => {
    const options = stateCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.maxAge).toBeLessThanOrEqual(600);
  });

  it("chỉ chấp nhận payload có đủ nonce và projectId", () => {
    expect(parseStateCookie(JSON.stringify({ nonce: "n1", projectId: "p1" }))).toEqual({
      nonce: "n1",
      projectId: "p1",
    });
    expect(parseStateCookie(JSON.stringify({ nonce: "n1" }))).toBeNull();
    expect(parseStateCookie(JSON.stringify({ nonce: "", projectId: "p1" }))).toBeNull();
    expect(parseStateCookie("khong-phai-json")).toBeNull();
    expect(parseStateCookie(undefined)).toBeNull();
  });
});

describe("đổi code lấy token", () => {
  const params = {
    tokenEndpoint: "https://public-api.wordpress.com/oauth2/token",
    clientId: "144802",
    clientSecret: "secret",
    redirectUri: "https://app.example.com/api/v1/integrations/wordpress-com/callback",
    code: "auth-code",
  };

  it("POST form-urlencoded và trả về access token + blog url", async () => {
    let captured: { url?: string; body?: string } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        captured = { url, body: String(init.body) };
        return new Response(
          JSON.stringify({
            access_token: "tok_123",
            blog_url: "https://site.wordpress.com",
            blog_id: "256219623",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const token = await exchangeWordpressComCode(params);

    expect(captured.url).toBe(params.tokenEndpoint);
    expect(captured.body).toContain("grant_type=authorization_code");
    expect(captured.body).toContain("code=auth-code");
    expect(token.access_token).toBe("tok_123");
    expect(token.blog_url).toBe("https://site.wordpress.com");
  });

  it("ném lỗi khi WordPress.com từ chối", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"error":"invalid_grant"}', { status: 400 })),
    );
    await expect(exchangeWordpressComCode(params)).rejects.toThrow(/từ chối cấp token/);
  });

  it("ném lỗi khi phản hồi thiếu access_token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
    await expect(exchangeWordpressComCode(params)).rejects.toThrow(/access_token/);
  });
});

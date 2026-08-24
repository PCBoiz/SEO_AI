import { z } from "zod";
import { ConfigurationError } from "@/domain/shared/app-error";

// Cấu hình OAuth2 cho WordPress.com (site gói Free/Cá nhân/Cao cấp — không có
// Application Password). Đây là credentials cấp ỨNG DỤNG, chỉ đọc ở server và
// không bao giờ gửi ra client. Token thu được lưu vào từng dự án qua vault.

const environmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  WORDPRESS_COM_CLIENT_ID: z.string().optional(),
  WORDPRESS_COM_CLIENT_SECRET: z.string().optional(),
});

export interface WordpressComOAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  redirectUri: string;
}

export const wordpressComAuthorizationEndpoint =
  "https://public-api.wordpress.com/oauth2/authorize";
export const wordpressComTokenEndpoint =
  "https://public-api.wordpress.com/oauth2/token";

export function isWordpressComOAuthConfigured(
  source: Record<string, string | undefined> = process.env,
): boolean {
  const environment = environmentSchema.parse(source);
  return (
    isConfigured(environment.WORDPRESS_COM_CLIENT_ID) &&
    isConfigured(environment.WORDPRESS_COM_CLIENT_SECRET)
  );
}

export function getWordpressComOAuthConfig(
  source: Record<string, string | undefined> = process.env,
): WordpressComOAuthConfig {
  const environment = environmentSchema.parse(source);
  return {
    clientId: requiredCredential(
      environment.WORDPRESS_COM_CLIENT_ID,
      "WORDPRESS_COM_CLIENT_ID",
    ),
    clientSecret: requiredCredential(
      environment.WORDPRESS_COM_CLIENT_SECRET,
      "WORDPRESS_COM_CLIENT_SECRET",
    ),
    authorizationEndpoint: wordpressComAuthorizationEndpoint,
    tokenEndpoint: wordpressComTokenEndpoint,
    redirectUri: buildRedirectUri(environment.NEXT_PUBLIC_APP_URL),
  };
}

export function buildRedirectUri(appUrl: string): string {
  let url: URL;
  try {
    url = new URL(appUrl);
  } catch {
    throw new ConfigurationError(
      "INVALID_APP_URL",
      "NEXT_PUBLIC_APP_URL phải là URL tuyệt đối.",
    );
  }
  const isLocalHttp =
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new ConfigurationError(
      "INSECURE_APP_URL",
      "OAuth chỉ cho phép HTTPS, ngoại trừ localhost khi phát triển.",
    );
  }
  url.search = "";
  url.hash = "";
  url.pathname = "/api/v1/integrations/wordpress-com/callback";
  return url.toString();
}

function requiredCredential(value: string | undefined, field: string): string {
  if (!isConfigured(value)) {
    throw new ConfigurationError(
      "WORDPRESS_COM_OAUTH_NOT_CONFIGURED",
      `${field} chưa được cấu hình ở server — chủ workspace cần thêm biến môi trường này.`,
      { field },
    );
  }
  return value!.trim();
}

function isConfigured(value: string | undefined): boolean {
  const trimmed = value?.trim();
  return Boolean(trimmed && !/^<.*>$/.test(trimmed));
}

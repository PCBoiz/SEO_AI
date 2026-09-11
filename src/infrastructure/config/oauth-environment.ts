import { z } from "zod";
import type { OAuthIntent, OAuthProviderId } from "@/domain/auth/oauth";
import { ConfigurationError } from "@/domain/shared/app-error";

const GOOGLE_LOGIN_SCOPES = ["openid", "email", "profile"] as const;
const GOOGLE_AUTOMATION_SCOPES = [
  ...GOOGLE_LOGIN_SCOPES,
  // ⚠️ `drive.readonly`, KHÔNG PHẢI `drive.file` (đổi 11/09).
  //
  // `drive.file` chỉ thấy tệp DO APP NÀY TẠO hoặc người dùng mở bằng app này.
  // Tính năng cần là: chủ dự án tải ảnh lên thư mục Drive bằng app Drive trên
  // điện thoại, rồi Antigravity đọc được. Với `drive.file`, thư mục đó hiện ra
  // RỖNG — kể cả khi chính app tạo thư mục, vì ảnh bên trong do người dùng tải.
  // Không có lỗi nào, chỉ là không có ảnh.
  //
  // `drive.readonly` là scope "restricted": app chưa thẩm định thì Google hiện
  // màn cảnh báo lúc cấp quyền và giới hạn 100 người dùng. Công cụ nội bộ hai
  // người nằm trong mục "personal use" của Google — bấm qua cảnh báo là dùng
  // được. Chỉ ĐỌC: app không ghi, không xoá gì trên Drive.
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
  // ⚠️ THIẾU DÒNG NÀY THÌ NÚT "KẾT NỐI SEARCH CONSOLE" BẤM ĐƯỢC MÀ VÔ DỤNG.
  //
  // Trang phân tích mời người dùng kết nối Search Console, nhưng danh sách
  // quyền lại chỉ xin Drive và Sheets. Người dùng bấm qua hết màn hình cấp
  // quyền của Google, thấy báo thành công, rồi mọi ô số liệu vẫn trống — vì
  // token nhận về không có quyền đọc Search Console.
  //
  // Đó là kiểu hỏng tệ nhất: mọi bước đều báo xanh, chỉ kết quả là không có.
  "https://www.googleapis.com/auth/webmasters.readonly",
] as const;
const MAKE_LOGIN_SCOPES = ["openid", "email", "profile"] as const;

/**
 * Quyền mà kết nối tự động hoá BẮT BUỘC phải có, kèm tên người đọc hiểu được.
 *
 * ⚠️ DANH SÁCH QUYỀN CÓ THỂ DÀI RA SAU KHI NGƯỜI DÙNG ĐÃ BẤM KẾT NỐI.
 *
 * Đúng chuyện vừa xảy ra: chủ trang bấm "Kết nối tự động hoá" khi danh sách còn
 * năm quyền, Google cấp token năm quyền. Sau đó `webmasters.readonly` được thêm
 * vào — nhưng token cũ nằm trong kho thì không tự dài ra theo.
 *
 * Kết quả: giao diện ghi "Đã kết nối · 5 scope đã cấp" màu xanh, còn mọi lệnh
 * gọi Search Console trả 403. Không một màn hình nào nói ra điều đó.
 *
 * Nên phải ĐỐI CHIẾU quyền đã cấp với quyền cần, chứ không đếm số quyền. Đếm
 * chỉ cho biết nhiều hay ít, không cho biết thiếu cái nào.
 */
const QUYEN_BAT_BUOC: Record<OAuthProviderId, { quyen: string; ten: string }[]> = {
  google: [
    { quyen: "https://www.googleapis.com/auth/drive.readonly", ten: "Google Drive" },
    { quyen: "https://www.googleapis.com/auth/spreadsheets", ten: "Google Sheets" },
    {
      quyen: "https://www.googleapis.com/auth/webmasters.readonly",
      ten: "Search Console",
    },
  ],
  make: [],
};

/**
 * Trả về TÊN những quyền còn thiếu — rỗng nghĩa là đủ.
 *
 * Nhận `daCap` rỗng cũng trả về đủ danh sách, nhưng nơi gọi phải tự phân biệt
 * "chưa kết nối bao giờ" với "kết nối rồi mà thiếu quyền": hai chuyện đó cần
 * hai câu chữ khác nhau, và hàm này cố tình không đoán hộ.
 */
export function quyenTuDongHoaConThieu(
  provider: OAuthProviderId,
  daCap: readonly string[],
): string[] {
  const co = new Set(daCap);
  return QUYEN_BAT_BUOC[provider]
    .filter((x) => !co.has(x.quyen))
    .map((x) => x.ten);
}

const environmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  MAKE_OAUTH_CLIENT_ID: z.string().optional(),
  MAKE_OAUTH_CLIENT_SECRET: z.string().optional(),
  MAKE_OAUTH_SCOPES: z.string().optional(),
});

export interface OAuthProviderConfiguration {
  id: OAuthProviderId;
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  jwksUri: string;
  issuer: string | string[];
  discoveryEndpoint?: string;
  scopes: string[];
  redirectUri: string;
}

export interface OAuthProviderStatus {
  id: OAuthProviderId;
  configured: boolean;
  automationScopesConfigured: boolean;
}

export function getOAuthProviderStatuses(
  source: Record<string, string | undefined> = process.env,
): OAuthProviderStatus[] {
  const environment = environmentSchema.parse(source);
  return [
    {
      id: "google",
      configured:
        isConfigured(environment.GOOGLE_OAUTH_CLIENT_ID) &&
        isConfigured(environment.GOOGLE_OAUTH_CLIENT_SECRET),
      automationScopesConfigured: true,
    },
    {
      id: "make",
      configured:
        isConfigured(environment.MAKE_OAUTH_CLIENT_ID) &&
        isConfigured(environment.MAKE_OAUTH_CLIENT_SECRET),
      automationScopesConfigured: parseScopes(environment.MAKE_OAUTH_SCOPES).length > 0,
    },
  ];
}

export function getOAuthProviderConfiguration(
  provider: OAuthProviderId,
  intent: OAuthIntent,
  source: Record<string, string | undefined> = process.env,
): OAuthProviderConfiguration {
  const environment = environmentSchema.parse(source);
  const baseUrl = parseApplicationBaseUrl(environment.NEXT_PUBLIC_APP_URL);
  const redirectUri = new URL(
    `/api/v1/oauth/${provider}/callback`,
    baseUrl,
  ).toString();

  if (provider === "google") {
    const clientId = requiredCredential(
      environment.GOOGLE_OAUTH_CLIENT_ID,
      "GOOGLE_OAUTH_CLIENT_ID",
    );
    const clientSecret = requiredCredential(
      environment.GOOGLE_OAUTH_CLIENT_SECRET,
      "GOOGLE_OAUTH_CLIENT_SECRET",
    );
    return {
      id: provider,
      clientId,
      clientSecret,
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      scopes:
        intent === "connect"
          ? [...GOOGLE_AUTOMATION_SCOPES]
          : [...GOOGLE_LOGIN_SCOPES],
      redirectUri,
    };
  }

  const clientId = requiredCredential(
    environment.MAKE_OAUTH_CLIENT_ID,
    "MAKE_OAUTH_CLIENT_ID",
  );
  const clientSecret = requiredCredential(
    environment.MAKE_OAUTH_CLIENT_SECRET,
    "MAKE_OAUTH_CLIENT_SECRET",
  );
  const configuredScopes = parseScopes(environment.MAKE_OAUTH_SCOPES);
  if (intent === "connect" && configuredScopes.length === 0) {
    throw new ConfigurationError(
      "MAKE_OAUTH_SCOPES_MISSING",
      "MAKE_OAUTH_SCOPES phải dùng đúng scope được Make cấp cho OAuth client.",
    );
  }

  return {
    id: provider,
    clientId,
    clientSecret,
    authorizationEndpoint: "https://www.make.com/oauth/v2/authorize",
    tokenEndpoint: "https://www.make.com/oauth/v2/token",
    userInfoEndpoint: "https://www.make.com/oauth/v2/oidc/userinfo",
    jwksUri: "https://www.make.com/oauth/v2/oidc/jwks",
    issuer: "https://www.make.com",
    discoveryEndpoint: "https://www.make.com/.well-known/openid-configuration",
    scopes: Array.from(
      new Set([
        ...MAKE_LOGIN_SCOPES,
        ...(intent === "connect" ? ["offline_access", ...configuredScopes] : []),
      ]),
    ),
    redirectUri,
  };
}

function parseApplicationBaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
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
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

function requiredCredential(value: string | undefined, field: string): string {
  if (!isConfigured(value)) {
    throw new ConfigurationError(
      "OAUTH_PROVIDER_NOT_CONFIGURED",
      `${field} chưa được cấu hình ở server.`,
      { field },
    );
  }
  return value!.trim();
}

function isConfigured(value: string | undefined): boolean {
  const trimmed = value?.trim();
  return Boolean(trimmed && !/^<.*>$/.test(trimmed));
}

function parseScopes(value: string | undefined): string[] {
  return Array.from(
    new Set(
      (value ?? "")
        .split(/[\s,]+/)
        .map((scope) => scope.trim())
        .filter((scope) => Boolean(scope) && !/^<.*>$/.test(scope)),
    ),
  );
}

import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getOAuthProviderConfiguration } from "@/infrastructure/config/oauth-environment";
import { quyenTuDongHoaConThieu } from "@/infrastructure/config/oauth-environment";
import { logger } from "@/infrastructure/observability/logger";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { getConnectionAad, getVault } from "@/lib/auth/oauth.server";
import { databaseAdapter } from "@/lib/db";
import { pgOauthConnections } from "@/lib/db/postgres-schema";
import { oauthConnections } from "@/lib/db/schema";

/* ══════════════════════════════════════════════════════════════════════════
   LẤY ACCESS TOKEN GOOGLE ĐỂ DÙNG THẬT

   ⚠️ TRƯỚC KHI CÓ TỆP NÀY, TOKEN CHỈ ĐƯỢC GHI VÀO CHỨ KHÔNG AI ĐỌC RA.

   `completeOAuth` mã hoá rồi cất token vào `oauth_connections`. Chỗ duy nhất
   đọc lại là chính nó, và chỉ để giữ `refreshToken` cũ khi người dùng bấm kết
   nối lần nữa. Tra cả kho ngày 10/09: không một dòng nào gọi Google API bằng
   token đó — không Drive, không Sheets, không Search Console.

   Nghĩa là màn hình xin quyền của Google chạy đủ, huy hiệu chuyển xanh, token
   nằm trong kho được mã hoá tử tế — rồi không việc gì xảy ra sau đó. Người dùng
   không có cách nào biết, vì mọi bước đều báo thành công.

   Tệp này là mảnh còn thiếu.
   ══════════════════════════════════════════════════════════════════════════ */

/** Đệm trước hạn: token sắp hết trong 2 phút thì coi như đã hết. */
const TOKEN_SAP_HET_HAN_MS = 120_000;
const FETCH_TIMEOUT_MS = 15_000;

export type KetQuaTokenGoogle =
  | { trangThai: "ok"; accessToken: string; scopes: string[] }
  | { trangThai: "chua-ket-noi" }
  | { trangThai: "thieu-quyen"; quyenConThieu: string[] }
  | { trangThai: "can-ket-noi-lai"; lyDo: string };

const luuTokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  tokenType: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

/**
 * Trả access token Google dùng được cho `identity` hiện tại.
 *
 * Bốn kết quả, cố ý tách rời vì mỗi cái cần một câu chữ khác ở giao diện: chưa
 * kết nối bao giờ · kết nối rồi mà thiếu quyền · token đã chết phía Google ·
 * dùng được.
 *
 * `quyenCan` là scope bắt buộc cho việc sắp làm — truyền vào chứ không đoán, vì
 * đọc Search Console và ghi Drive cần hai quyền khác nhau, và báo "thiếu quyền
 * Drive" cho người chỉ muốn xem thứ hạng là chỉ sai đường.
 */
export async function layAccessTokenGoogle(
  identity: AuthenticatedIdentity,
  quyenCan: readonly string[] = [],
): Promise<KetQuaTokenGoogle> {
  const [row] =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({
            id: pgOauthConnections.id,
            scopes: pgOauthConnections.scopes,
            status: pgOauthConnections.status,
            encryptedTokens: pgOauthConnections.encryptedTokens,
          })
          .from(pgOauthConnections)
          .where(
            and(
              eq(pgOauthConnections.workspaceId, identity.workspaceId),
              eq(pgOauthConnections.userId, identity.userId),
              eq(pgOauthConnections.provider, "google_workspace"),
            ),
          )
          .limit(1)
      : await databaseAdapter.db
          .select({
            id: oauthConnections.id,
            scopes: oauthConnections.scopes,
            status: oauthConnections.status,
            encryptedTokens: oauthConnections.encryptedTokens,
          })
          .from(oauthConnections)
          .where(
            and(
              eq(oauthConnections.workspaceId, identity.workspaceId),
              eq(oauthConnections.userId, identity.userId),
              eq(oauthConnections.provider, "google_workspace"),
            ),
          )
          .limit(1);

  if (!row || row.status !== "active") return { trangThai: "chua-ket-noi" };

  const daCap = new Set(row.scopes ?? []);
  if (quyenCan.some((q) => !daCap.has(q))) {
    return {
      trangThai: "thieu-quyen",
      quyenConThieu: quyenTuDongHoaConThieu("google", row.scopes ?? []),
    };
  }

  const aad = getConnectionAad(identity.workspaceId, identity.userId, "google");
  let daLuu: z.infer<typeof luuTokenSchema>;
  try {
    daLuu = luuTokenSchema.parse(
      JSON.parse(getVault().decrypt(row.encryptedTokens, aad)),
    );
  } catch {
    // Giải mã hỏng nghĩa là khoá vault đã đổi hoặc bản ghi hỏng. Không có đường
    // tự chữa — người dùng phải kết nối lại.
    logger.warn(
      { workspaceId: identity.workspaceId },
      "Google OAuth tokens could not be decrypted",
    );
    return {
      trangThai: "can-ket-noi-lai",
      lyDo: "Không giải mã được token đã lưu.",
    };
  }

  const conHan =
    daLuu.expiresAt !== undefined &&
    new Date(daLuu.expiresAt).getTime() - Date.now() > TOKEN_SAP_HET_HAN_MS;
  if (conHan) {
    return {
      trangThai: "ok",
      accessToken: daLuu.accessToken,
      scopes: row.scopes ?? [],
    };
  }

  if (!daLuu.refreshToken) {
    // Google chỉ phát refresh token ở lần cấp quyền ĐẦU cho mỗi ứng dụng, trừ
    // khi xin kèm `prompt=consent`. Không có nó thì hết hạn là hết — gọi lại
    // cũng không cứu được.
    return {
      trangThai: "can-ket-noi-lai",
      lyDo: "Token đã hết hạn và không có refresh token để làm mới.",
    };
  }

  return lamMoiToken(identity, row.id, aad, daLuu.refreshToken, row.scopes ?? []);
}

/**
 * Đổi refresh token lấy access token mới, rồi ghi đè bản đã lưu.
 *
 * ⚠️ GIỮ LẠI REFRESH TOKEN CŨ. Google KHÔNG gửi lại `refresh_token` trong phản
 * hồi của `grant_type=refresh_token`. Ghi đè bằng `undefined` là mất nó vĩnh
 * viễn, và lần hết hạn sau không còn đường làm mới — hỏng lặng lẽ đúng một
 * tiếng sau khi mọi thứ trông vẫn đang chạy tốt.
 */
async function lamMoiToken(
  identity: AuthenticatedIdentity,
  connectionId: string,
  aad: string,
  refreshToken: string,
  scopes: string[],
): Promise<KetQuaTokenGoogle> {
  const configuration = getOAuthProviderConfiguration("google", "connect");
  let response: Response;
  try {
    response = await fetch(configuration.tokenEndpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: configuration.clientId,
        client_secret: configuration.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    // Mạng hỏng KHÔNG phải token hỏng. Đừng đánh dấu kết nối là đã thu hồi chỉ
    // vì một lần gọi trượt — làm thế là bắt người dùng cấp quyền lại vì Wi-Fi
    // chập một nhịp.
    return {
      trangThai: "can-ket-noi-lai",
      lyDo: "Không gọi được máy chủ token của Google.",
    };
  }

  if (!response.ok) {
    const chiTiet = await response.text().catch(() => "");
    // `invalid_grant` là câu Google trả khi người dùng đã thu hồi quyền trong
    // tài khoản của họ, hoặc refresh token đã chết. Đó là kết luận CHẮC CHẮN,
    // khác hẳn lỗi mạng ở trên — nên ghi vào kho để giao diện thôi hiển thị
    // "Đã kết nối" màu xanh cho một kết nối đã chết.
    if (chiTiet.includes("invalid_grant")) {
      await danhDauKetNoiHong(identity, connectionId, "revoked");
      return {
        trangThai: "can-ket-noi-lai",
        lyDo: "Google báo quyền đã bị thu hồi.",
      };
    }
    logger.warn({ status: response.status }, "Google token refresh failed");
    return {
      trangThai: "can-ket-noi-lai",
      lyDo: `Google từ chối làm mới token (HTTP ${response.status}).`,
    };
  }

  const parsed = z
    .object({
      access_token: z.string().min(1),
      expires_in: z.number().optional(),
      token_type: z.string().optional(),
    })
    .safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    return {
      trangThai: "can-ket-noi-lai",
      lyDo: "Phản hồi làm mới token của Google không đọc được.",
    };
  }

  const now = new Date();
  const expiresAt = parsed.data.expires_in
    ? new Date(now.getTime() + parsed.data.expires_in * 1000)
    : null;
  const encryptedTokens = getVault().encrypt(
    JSON.stringify({
      accessToken: parsed.data.access_token,
      refreshToken,
      tokenType: parsed.data.token_type ?? "Bearer",
      expiresAt: expiresAt?.toISOString(),
    }),
    aad,
  );

  if (databaseAdapter.kind === "neon") {
    await databaseAdapter.db
      .update(pgOauthConnections)
      .set({ encryptedTokens, accessTokenExpiresAt: expiresAt, updatedAt: now })
      .where(eq(pgOauthConnections.id, connectionId));
  } else {
    await databaseAdapter.db
      .update(oauthConnections)
      .set({ encryptedTokens, accessTokenExpiresAt: expiresAt, updatedAt: now })
      .where(eq(oauthConnections.id, connectionId));
  }

  return { trangThai: "ok", accessToken: parsed.data.access_token, scopes };
}

async function danhDauKetNoiHong(
  identity: AuthenticatedIdentity,
  connectionId: string,
  trangThai: "revoked" | "expired",
): Promise<void> {
  const now = new Date();
  if (databaseAdapter.kind === "neon") {
    await databaseAdapter.db
      .update(pgOauthConnections)
      .set({ status: trangThai, updatedAt: now })
      .where(eq(pgOauthConnections.id, connectionId));
  } else {
    await databaseAdapter.db
      .update(oauthConnections)
      .set({ status: trangThai, updatedAt: now })
      .where(eq(oauthConnections.id, connectionId));
  }
  logger.warn(
    { workspaceId: identity.workspaceId, trangThai },
    "Google OAuth connection marked unusable",
  );
}

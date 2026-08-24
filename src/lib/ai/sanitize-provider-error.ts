import { AiProviderError } from "@/infrastructure/ai/ai-provider-error";

// Dựng thông điệp lỗi an toàn để LƯU vào job / hiển thị cho owner: nối HTTP status
// và thông điệp gốc của provider (đã bắt trong AiProviderError.details), rồi loại
// mọi chuỗi trông giống secret (key) trước khi rời server. Không bao giờ chứa key.
export function sanitizeProviderErrorMessage(
  error: unknown,
  fallback = "Không thể chạy job.",
): string {
  let raw = error instanceof Error ? error.message : fallback;
  if (error instanceof AiProviderError) {
    const status =
      typeof error.details?.status === "number"
        ? ` (HTTP ${error.details.status})`
        : "";
    const detail =
      typeof error.details?.detail === "string"
        ? ` Provider báo: "${error.details.detail}"`
        : "";
    raw = `${raw}${status}${detail}`;
  }
  return cheBiMat(raw).slice(0, 500);
}

/**
 * Che mọi thứ trông giống bí mật trước khi chuỗi rời máy chủ.
 *
 * Chuỗi trả về được LƯU vào job và HIỆN TRÊN GIAO DIỆN (xem
 * `module-engine.server.ts`), nên đây là ranh giới cuối cùng.
 *
 * Bốn mẫu, và hai mẫu cuối được thêm sau khi thử thật thấy chúng lọt:
 *
 *   · `sk-…`      khoá OpenAI / DeepSeek / Anthropic
 *   · `AIza…`     khoá Google
 *   · `scheme://người:mậtkhẩu@máy`  chuỗi kết nối cơ sở dữ liệu — Postgres báo
 *     lỗi kết nối là kèm nguyên chuỗi này, mật khẩu và tất cả
 *   · `Bearer <token>`  token uỷ quyền trong thông báo lỗi HTTP
 *
 * CỐ Ý KHÔNG che "mọi chuỗi dài ngẫu nhiên": làm vậy sẽ nuốt luôn mã lỗi, mã
 * job và tên file — biến thông báo lỗi thành vô dụng. Thà che ít mà đúng.
 */
function cheBiMat(chuoi: string): string {
  return (
    chuoi
      .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-***")
      .replace(/AIza[A-Za-z0-9_-]{8,}/g, "AIza***")
      // Giữ lại phần tên máy để còn gỡ lỗi được; chỉ bỏ phần người dùng+mật khẩu.
      .replace(
        /([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi,
        "$1***:***@",
      )
      .replace(/\b(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]{8,}/gi, "$1 ***")
  );
}

export function extractErrorCode(error: unknown, fallback: string): string {
  return error instanceof Error && "code" in error
    ? String((error as { code: unknown }).code)
    : fallback;
}

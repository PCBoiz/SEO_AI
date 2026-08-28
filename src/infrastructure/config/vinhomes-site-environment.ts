import { z } from "zod";
import { ConfigurationError } from "@/domain/shared/app-error";

// Cấu hình cổng đẩy bài sang một trang tự code.
//
// ═══════════════════════════════════════════════════════════════════════════
// GHI CHÚ CŨ Ở ĐÂY DỰA TRÊN MỘT ĐIỀU KHÔNG ĐÚNG, VÀ NÓ TỐN THẬT.
//
// Nguyên văn: "CỐ Ý DÙNG BIẾN MÔI TRƯỜNG thay vì thêm một kiểu tích hợp lưu
// trong vault… Thêm kiểu tích hợp mới sẽ kéo theo đổi lược đồ cơ sở dữ liệu và
// một lần migration trên Neon — cái giá quá lớn cho một đích đến duy nhất."
//
// Cái giá đó không tồn tại. Cột `type` của `project_integrations` là `text` với
// `enum` CHỈ ở tầng TypeScript — SQL sinh ra không có ràng buộc CHECK nào, nên
// thêm một kiểu là sửa một mảng, không migration.
//
// Và cách "rẻ" hoá ra đắt hơn: biến môi trường là MỘT giá trị cho cả hệ thống,
// nên mỗi lần thêm một trang là một lần sửa biến rồi triển khai lại toàn bộ
// Antigravity — thay vì hai phút điền form. Nó cũng khiến bước đăng bài không
// thể chọn theo dự án, và đó là lý do luồng "Chạy cả luồng" chết ở bước đăng
// WordPress cho một dự án vốn không dùng WordPress.
//
// GIỜ: đọc theo DỰ ÁN từ `project_integrations` (loại `custom_site`), và chỉ
// rơi về biến môi trường khi dự án chưa cấu hình — để những gì đang chạy bằng
// biến môi trường không gãy giữa chừng.
// ═══════════════════════════════════════════════════════════════════════════

const environmentSchema = z.object({
  VINHOMES_SITE_URL: z.string().optional(),
  VINHOMES_INGEST_TOKEN: z.string().optional(),
});

export interface VinhomesSiteConfig {
  /** Gốc của site, không có dấu / ở cuối. */
  siteUrl: string;
  ingestUrl: string;
  token: string;
}

export function isVinhomesSiteConfigured(
  source: Record<string, string | undefined> = process.env,
): boolean {
  const environment = environmentSchema.parse(source);
  return (
    isConfigured(environment.VINHOMES_SITE_URL) &&
    isConfigured(environment.VINHOMES_INGEST_TOKEN)
  );
}

export function getVinhomesSiteConfig(
  source: Record<string, string | undefined> = process.env,
): VinhomesSiteConfig {
  const environment = environmentSchema.parse(source);
  const siteUrl = normalizeSiteUrl(
    requiredValue(environment.VINHOMES_SITE_URL, "VINHOMES_SITE_URL"),
  );
  return {
    siteUrl,
    ingestUrl: `${siteUrl}/api/ingest`,
    token: requiredValue(
      environment.VINHOMES_INGEST_TOKEN,
      "VINHOMES_INGEST_TOKEN",
    ),
  };
}

/**
 * Cấu hình lấy từ tích hợp THEO DỰ ÁN, rơi về biến môi trường nếu chưa có.
 *
 * Thứ tự ưu tiên đó là chủ đích: dự án nào đã điền ở màn "Kết nối nền tảng" thì
 * dùng đúng giá trị của nó; dự án chưa điền thì vẫn chạy được bằng biến môi
 * trường như trước. Không có nhánh rơi về, mọi luồng đang chạy sẽ gãy ngay lúc
 * đổi — và gãy ở bước cuối, sau khi đã đốt xong tiền gọi mô hình cho tám bước
 * trước đó.
 *
 * @param tichHop cấu hình + bí mật đã giải mã của loại `custom_site`, nếu dự án
 *                đã cấu hình; `undefined` nếu chưa.
 */
export function layCauHinhTrang(
  tichHop?: { config: Record<string, string>; secret: string },
  source: Record<string, string | undefined> = process.env,
): VinhomesSiteConfig {
  const diaChi = tichHop?.config?.siteUrl?.trim();
  const khoa = tichHop?.secret?.trim();

  if (diaChi && khoa) {
    const siteUrl = normalizeSiteUrl(diaChi);
    return { siteUrl, ingestUrl: `${siteUrl}/api/ingest`, token: khoa };
  }

  // Cấu hình NỬA VỜI thì dừng hẳn, đừng lặng lẽ rơi về biến môi trường.
  //
  // Nếu dự án có địa chỉ nhưng thiếu khoá (hoặc ngược lại), rơi về biến môi
  // trường nghĩa là bài được đẩy sang MỘT TRANG KHÁC với trang người dùng vừa
  // điền — và job báo thành công. Sai âm thầm, và sai theo hướng tệ nhất: nội
  // dung của khách này lên trang của khách kia.
  if (diaChi || khoa) {
    throw new ConfigurationError(
      "CUSTOM_SITE_HALF_CONFIGURED",
      "Kết nối trang tự code của dự án này mới điền một nửa — cần cả địa chỉ trang lẫn khoá đăng bài. Mở phần “Kết nối nền tảng” để điền nốt.",
    );
  }

  return getVinhomesSiteConfig(source);
}

function normalizeSiteUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ConfigurationError(
      "INVALID_VINHOMES_SITE_URL",
      "VINHOMES_SITE_URL phải là URL tuyệt đối, ví dụ https://tenmien.com.",
    );
  }
  // Token đi kèm mỗi lần gọi nên chỉ cho phép kênh mã hoá; localhost được miễn
  // để chạy thử ở máy.
  const isLocalHttp =
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new ConfigurationError(
      "INSECURE_VINHOMES_SITE_URL",
      "VINHOMES_SITE_URL phải dùng HTTPS (trừ localhost khi phát triển) vì token được gửi kèm.",
    );
  }
  return `${url.protocol}//${url.host}`;
}

function requiredValue(value: string | undefined, field: string): string {
  if (!isConfigured(value)) {
    throw new ConfigurationError(
      "VINHOMES_SITE_NOT_CONFIGURED",
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

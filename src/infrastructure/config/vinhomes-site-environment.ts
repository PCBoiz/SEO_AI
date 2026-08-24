import { z } from "zod";
import { ConfigurationError } from "@/domain/shared/app-error";

// Cấu hình cổng đẩy bài sang site Vinhomes Global Gate Hạ Long.
//
// CỐ Ý DÙNG BIẾN MÔI TRƯỜNG thay vì thêm một kiểu tích hợp lưu trong vault:
// đây là MỘT site cố định, không phải thứ mỗi dự án cấu hình một kiểu. Thêm
// kiểu tích hợp mới sẽ kéo theo đổi lược đồ cơ sở dữ liệu và một lần migration
// trên Neon — cái giá quá lớn cho một đích đến duy nhất.
//
// Khi nào cần đẩy sang nhiều site tự code, lúc đó mới tổng quát hoá thành tích
// hợp lưu theo dự án.

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

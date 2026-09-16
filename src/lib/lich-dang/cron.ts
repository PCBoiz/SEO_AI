import { timingSafeEqual } from "node:crypto";

/**
 * Kiểm mã của cron Vercel — phần THUẦN, tách khỏi tệp tuyến để có phép thử
 * (tệp tuyến App Router không được xuất thêm hàm nào ngoài GET/POST…).
 *
 * Theo tài liệu Vercel (docs/cron-jobs/manage-cron-jobs, 08/2026): đặt biến
 * môi trường `CRON_SECRET` (khuyên ≥ 16 ký tự ngẫu nhiên) thì mỗi lượt gọi
 * cron mang `Authorization: Bearer <CRON_SECRET>`.
 *
 * Hai luật cố ý:
 *   · CHƯA đặt biến → từ chối tất cả. Nhờ vậy đưa `crons` vào `vercel.json`
 *     trước cũng vô hại: chưa tiêu một lượt AI nào cho tới khi chủ dự án chủ
 *     động đặt biến. Tuyến báo 503 kèm câu phải làm gì, không phải 401 câm.
 *   · Biến ngắn hơn 16 ký tự cũng từ chối — chặn chuyện đặt tạm "123456".
 */
export const DO_DAI_MA_CRON_TOI_THIEU = 16;

export type KetQuaKiemMaCron = "chua-bat" | "sai" | "dung";

export function kiemMaCron(
  authHeader: string | null | undefined,
  secret: string | undefined,
): KetQuaKiemMaCron {
  if (!secret || secret.length < DO_DAI_MA_CRON_TOI_THIEU) return "chua-bat";
  if (!authHeader) return "sai";
  const a = Buffer.from(authHeader, "utf8");
  const b = Buffer.from(`Bearer ${secret}`, "utf8");
  // So sánh thời gian hằng — độ dài lệch thì `timingSafeEqual` ném, nên xét trước.
  if (a.length !== b.length) return "sai";
  return timingSafeEqual(a, b) ? "dung" : "sai";
}

/** Câu cho người vận hành, in trong log cron và trong VIEC-CAN-LAM. */
export const CAU_CRON_CHUA_BAT =
  "Cron chưa bật: đặt biến CRON_SECRET (≥ 16 ký tự ngẫu nhiên) ở Vercel → Settings → Environment Variables rồi Redeploy.";

import { z } from "zod";

/**
 * Hợp đồng giữa website và cổng nhận khách — phần thuần, KHÔNG gọi mạng.
 *
 * Tách khỏi `lead-sheet.server.ts` để test được: đây là chỗ hai kho gặp nhau
 * (`dang-ky-action.ts` bên halongxanh360 gửi, cổng này nhận), và lệch ở đây là
 * mất khách thật mà không ai thấy lỗi.
 */

/** Cột trong bảng — trùng bố cục `NHAN-DANG-KY.md` bên kho site, thêm cột Nguồn. */
export const TIEU_DE_COT = [
  "Thời điểm",
  "Điện thoại",
  "Quan tâm nhất",
  "Họ tên",
  "Đang xem",
  "Ghi chú",
  "Nguồn",
] as const;

/**
 * Thân yêu cầu website gửi — đúng các trường `dang-ky-action.ts` đang gửi.
 *
 * ⚠️ KHÔNG `.strict()`. Trường lạ bị BỎ QUA, không bị từ chối.
 *
 * Bên website thêm một trường về sau (nguồn quảng cáo, trang đang xem…) mà cổng
 * này strict thì MỌI lượt khách trả 400, website báo "chưa gửi được", và số
 * điện thoại rơi mất — cho tới khi có người để ý. Nhận rộng tay ở đây không mở
 * thêm rủi ro nào: trường lạ không được ghi đi đâu.
 */
export const khachLienHeSchema = z.object({
  dienThoai: z.string().trim().min(6).max(32),
  uuTien: z.string().trim().max(200).default(""),
  hoTen: z.string().trim().max(200).default(""),
  quanTam: z.string().trim().max(500).default(""),
  ghiChu: z.string().trim().max(2_000).default(""),
  thoiDiem: z.string().trim().max(64).default(""),
  nguon: z.string().trim().max(200).default(""),
});
export type KhachLienHe = z.infer<typeof khachLienHeSchema>;

/** Một dòng để nối vào bảng, đúng thứ tự `TIEU_DE_COT`. */
export function dongChoBang(khach: KhachLienHe, bayGio: Date = new Date()): string[] {
  return [
    thoiDiemVN(khach.thoiDiem, bayGio),
    // Dấu nháy đơn KHÔNG cần: bảng ghi bằng `valueInputOption=RAW`, nên "0941…"
    // giữ nguyên số 0 đầu. Nếu ai đổi sang USER_ENTERED thì Google hiểu là số
    // và cắt mất số 0 — test dưới khoá điều đó lại.
    khach.dienThoai,
    khach.uuTien,
    khach.hoTen,
    khach.quanTam,
    khach.ghiChu,
    khach.nguon,
  ];
}

/**
 * Thời điểm theo giờ Việt Nam, dạng `2026-09-11 21:05`.
 *
 * Website gửi chuỗi ISO giờ UTC. Ghi y nguyên thì chủ dự án mở bảng thấy khách
 * "gửi lúc 14:05" trong khi thật ra là 21:05 — lệch bảy tiếng, đủ để gọi lại
 * nhầm buổi. Dạng năm-tháng-ngày giữ được việc sắp xếp theo cột.
 */
export function thoiDiemVN(iso: string, bayGio: Date = new Date()): string {
  const d = iso ? new Date(iso) : bayGio;
  const t = Number.isNaN(d.getTime()) ? bayGio : d;
  const phan = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(t);
  const lay = (k: string) => phan.find((x) => x.type === k)?.value ?? "";
  // hour12:false có thể trả "24" cho nửa đêm ở vài bản ICU — chuẩn về "00".
  const gio = lay("hour") === "24" ? "00" : lay("hour");
  return `${lay("year")}-${lay("month")}-${lay("day")} ${gio}:${lay("minute")}`;
}

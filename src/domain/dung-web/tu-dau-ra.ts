import { docJson } from "./doc-json";
import { kienTrucSchema, type KienTrucWeb } from "./kien-truc";
import { heThietKeSchema, type HeThietKe } from "./he-thiet-ke";
import type { NoiDungTheoKhoi } from "./dung-cay-tep";

/**
 * Gộp đầu ra ba bước dựng web thành một hợp đồng dựng được.
 *
 * THUẦN, KHÔNG CHẠM CƠ SỞ DỮ LIỆU. Bên gọi đưa vào bản đã làm phẳng của từng
 * module (`flattenModuleOutput`), việc đọc bảng job là của tầng server. Tách
 * thế này để kiểm được đúng chỗ hay sai — JSON nằm trong khối ```json giữa
 * một đống chữ tiếng Việt — mà không phải dựng cả một cơ sở dữ liệu giả.
 */

export const KHOA_KIEN_TRUC = "RIS_WEB_KIEN_TRUC";
export const KHOA_THIET_KE = "RIS_WEB_THIET_KE";
export const KHOA_VIET_CHU = "RIS_WEB_VIET_CHU";

/** Hệ thiết kế phòng hờ khi chưa chạy #26 — trung tính, đủ tương phản. */
export const THIET_KE_MAC_DINH: HeThietKe = heThietKeSchema.parse({
  mau: { nen: "#101214", chu: "#f2f4f5", nhan: "#4ea8de", phu: "#9aa5ad" },
  font: { tieuDe: "Be Vietnam Pro", than: "Be Vietnam Pro" },
  khoangCach: "vua",
  goc: "bo-nhe",
  giong: ["trung tính", "dễ đọc"],
  lyDo: "Bản phòng hờ khi chưa chạy bước Hệ thiết kế — đủ tương phản, không màu mè.",
});

export interface HopDongWeb {
  kienTruc: KienTrucWeb;
  thietKe: HeThietKe;
  chu: NoiDungTheoKhoi;
  /** Bước chưa chạy — để giao diện nói rõ còn thiếu gì. */
  thieu: string[];
}

/** `null` = chưa có kiến trúc, tức chưa có gì để dựng. */
export function docHopDongTuDauRa(dauRa: ReadonlyMap<string, string>): HopDongWeb | null {
  const kt = kienTrucSchema.safeParse(docJson(dauRa.get(KHOA_KIEN_TRUC) ?? ""));
  if (!kt.success) return null;

  const thieu: string[] = [];
  const tk = heThietKeSchema.safeParse(docJson(dauRa.get(KHOA_THIET_KE) ?? ""));
  if (!tk.success) thieu.push("Hệ thiết kế (#26) — đang dùng bộ màu phòng hờ");

  const choChu = docJson(dauRa.get(KHOA_VIET_CHU) ?? "");
  const chu: NoiDungTheoKhoi = {};
  if (choChu && typeof choChu === "object") {
    for (const [khoa, giaTri] of Object.entries(choChu as Record<string, unknown>)) {
      // Chỉ nhận khoá đúng khuôn `<đường trang>#<số khối>`; đầu ra cũ hoặc
      // model lạc đề có thể nhét khoá khác vào, và một khoá lạ thì bộ sinh mã
      // âm thầm bỏ qua — người dùng không hiểu vì sao chữ không lên trang.
      if (!/^\/[^\s#]*#\d+$/.test(khoa)) continue;
      if (giaTri && typeof giaTri === "object" && !Array.isArray(giaTri)) {
        chu[khoa] = giaTri as NoiDungTheoKhoi[string];
      }
    }
  }
  if (Object.keys(chu).length === 0) thieu.push("Viết chữ (#27) — khối sẽ dùng câu ý đồ của bước Kiến trúc");

  return { kienTruc: kt.data, thietKe: tk.success ? tk.data : THIET_KE_MAC_DINH, chu, thieu };
}

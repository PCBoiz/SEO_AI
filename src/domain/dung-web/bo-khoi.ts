/**
 * Suy "bộ khối" cho bước Kiến trúc (#25) từ chữ người dùng đã điền.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO PHẢI SUY, KHÔNG HỎI
 *
 * #25 có ô chọn "Bộ khối": *ngành chung* hay *bất động sản* (bộ này mở thêm
 * bảng hàng, quỹ căn, giá thực trả, sơ đồ phân khu). Nhưng khi chạy cả luồng
 * "Dựng website — bản nháp" từ trang Bắt đầu, ô đó KHÔNG hiện — luồng chỉ hỏi
 * những ô dùng chung — nên nó luôn rơi về "chung". Chủ dự án làm bất động sản:
 * website đầu tiên chị dựng cho khách gần như chắc là một sàn môi giới, và máy
 * sẽ không bao giờ mời khối bảng hàng cho nó. Lỗi im lặng đúng kiểu khó thấy:
 * trang vẫn ra, chỉ thiếu đúng phần quan trọng nhất.
 *
 * Ngành nghề của dự án và câu mô tả đã nói rõ rồi; đọc từ đó. Người dùng vẫn
 * đổi được ở bước #25 khi chạy lẻ.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type BoKhoi = "chung" | "bat-dong-san";

const DAU_HIEU_BDS =
  /bất động sản|bat dong san|\bbđs\b|nhà đất|nha dat|căn hộ|can ho|chung cư|chung cu|biệt thự|biet thu|liền kề|lien ke|đất nền|dat nen|shophouse|quỹ căn|quy can|bảng hàng|bang hang|phân khu|phan khu|real estate|môi giới nhà|moi gioi nha|sàn giao dịch|san giao dich/i;

/** Ghép mọi đoạn chữ có, tìm dấu hiệu bất động sản. Không có → ngành chung. */
export function suyBoKhoi(...van: Array<string | null | undefined>): BoKhoi {
  const t = van.filter((v): v is string => typeof v === "string" && v.trim().length > 0).join(" \n ");
  return DAU_HIEU_BDS.test(t) ? "bat-dong-san" : "chung";
}

export function tenBoKhoi(bo: BoKhoi): string {
  return bo === "bat-dong-san" ? "Bất động sản (có bảng hàng, quỹ căn, giá thực trả, sơ đồ phân khu)" : "Ngành chung";
}

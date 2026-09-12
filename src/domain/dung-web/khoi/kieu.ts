/**
 * KHỐI DỰNG SẴN — bản hiện thực của danh mục.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO KHÔNG CHÉP THẲNG COMPONENT CỦA halongxanh360
 *
 * Danh mục (`danh-muc-thanh-phan.ts`) là TỪ VỰNG: nó cho AI biết trang có thể
 * gồm những loại khối nào, và tên khối là tên có thật vì đã chạy trên một
 * trang thương mại. Nhưng bản thân mã của những khối đó KHÔNG chép sang được:
 *
 *   · chúng nhập `@/data/project` — bảng hàng, phân khu, giá của đúng một dự án;
 *   · chúng dùng token màu riêng (`text-paper-dim`, `bg-ink-soft`, `py-nhip`)
 *     định nghĩa trong `globals.css` của kho đó;
 *   · nhiều khối kéo theo GSAP, Lenis, `use-in-view` — chép một khối là chép
 *     cả chuỗi phụ thuộc, và website khách không cần chúng.
 *
 * Chép sang thì `next build` gãy ngay dòng nhập đầu tiên. Nên ở đây viết LẠI
 * mỗi khối thành một khuôn nhỏ, tự đủ, không phụ thuộc gì ngoài React +
 * Tailwind, dùng token của hệ thiết kế do bước #26 chọn. Cùng tên khối, cùng
 * vai trò, mã khác — và mã này thì build được ở bất cứ đâu.
 *
 * ⚠️ MỌI CHỮ ĐI VÀO TSX PHẢI QUA `chu()`. Chữ do model sinh ra là dữ liệu
 * không tin được: một dấu `{`, `<`, hay dấu nháy ngược lọt vào JSX là tệp
 * không biên dịch được, và lỗi hiện ra ở bước `next build` — xa chỗ gây lỗi
 * hàng chục phút. `chu()` bọc mọi thứ thành chuỗi JS hợp lệ nên không có ký
 * tự nào của chữ chạm tới cú pháp JSX.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type KieuTruong = "chu" | "doan" | "danh-sach" | "muc";

export interface TruongKhoi {
  khoa: string;
  nhan: string;
  kieu: KieuTruong;
  /** Gợi ý cho model khi viết chữ cho ô này. */
  goiY?: string;
  /** Số mục tối đa (kiểu `danh-sach` / `muc`). */
  toiDa?: number;
}

export interface MucNoiDung {
  tieuDe: string;
  than: string;
}

export type GiaTriTruong = string | string[] | MucNoiDung[];
export type NoiDungKhoi = Record<string, GiaTriTruong>;

/** Thông tin chung của website — khối nào cũng đọc được. */
export interface BoiCanhSinh {
  tenWebsite: string;
  dienThoai: string;
  /**
   * Link Zalo, hoặc `null` khi chủ website không có.
   *
   * ⚠️ KHÔNG rơi về `tel:` khi thiếu. Bản đầu làm thế, và kết quả là một nút
   * ghi "Nhắn Zalo" nhưng bấm vào thì GỌI ĐIỆN — thấy ngay khi xem trang thật.
   * Không có Zalo thì bỏ hẳn nút, đừng hứa một thứ không có.
   */
  zalo: string | null;
  /** Trang trong website: để khối điều hướng dựng menu. */
  trang: ReadonlyArray<{ duong: string; tieuDe: string }>;
  /**
   * Ảnh thật đã có trong `public/anh/` — chỉ ảnh CHỦ WEBSITE đưa (từ thư mục
   * Drive của dự án). Rỗng thì khối tự xoay: không có ảnh còn hơn ảnh sai.
   *
   * ⚠️ KHÔNG sinh ảnh bằng AI. Chủ dự án đã bác chuyện đó ngày 12/09 sau khi
   * ba tấm ảnh AI lọt lên trang thật và khách tinh mắt nhận ra ngay.
   */
  anh: ReadonlyArray<{ ten: string; alt: string }>;
}

export interface KhoiMau {
  ma: string;
  /** Tên component sinh ra (PascalCase, duy nhất trong dự án). */
  component: string;
  truong: TruongKhoi[];
  /** Nội dung tệp `src/components/khoi/<ma>.tsx`. */
  sinh(nd: NoiDungKhoi, ctx: BoiCanhSinh): string;
}

/* ─────────────────────── Bọc chữ an toàn cho JSX ───────────────────────── */

/** Một chuỗi chữ → biểu thức JSX an toàn: `{"…"}`. */
export function chu(giaTri: unknown): string {
  return `{${JSON.stringify(String(giaTri ?? ""))}}`;
}

/** Chuỗi chữ → chuỗi JS (dùng trong thuộc tính, mảng, JSON-LD). */
export function chuoi(giaTri: unknown): string {
  return JSON.stringify(String(giaTri ?? ""));
}

/**
 * Dữ liệu có cấu trúc → biểu thức JS cho `dangerouslySetInnerHTML.__html`.
 *
 * ⚠️ THAY `<` BẰNG `\u003c`. Chữ trong JSON-LD do model viết (câu trả lời hỏi
 * đáp, mô tả); một chuỗi `</script>` lọt vào là trình duyệt đóng thẻ script
 * ngay giữa chừng và phần còn lại thành HTML — lỗ hổng cổ điển của việc nhúng
 * JSON vào trang. `\u003c` thì máy đọc JSON vẫn hiểu là `<`, còn HTML không.
 */
export function jsonLd(du: unknown): string {
  return chuoi(JSON.stringify(du).replace(/</g, "\\u003c"));
}

/* ─────────────────────── Đọc nội dung có phòng hờ ──────────────────────── */

/**
 * Khoá đặc biệt: câu MỘT DÒNG mà kiến trúc (#25) viết cho khối này — "khối
 * này nói gì ở đây".
 *
 * Vì sao quan trọng: khi chưa chạy bước viết chữ (#27), mọi khối đều rỗng. Bản
 * đầu in "Đang cập nhật" — dựng ra một trang trông như bỏ hoang, và chủ website
 * xem thử thì tưởng máy hỏng. Câu ý đồ thì ít nhất nói đúng khối đó để làm gì,
 * và nhìn ra ngay chỗ nào còn phải viết.
 */
export const KHOA_MO_TA = "_mo_ta";

export function moTa(nd: NoiDungKhoi): string {
  const v = nd[KHOA_MO_TA];
  return typeof v === "string" ? v.trim() : "";
}

export function layChu(nd: NoiDungKhoi, khoa: string, duPhong: string): string {
  const v = nd[khoa];
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v) && v.length > 0) {
    const dau = v[0];
    if (typeof dau === "string") return dau;
    if (dau && typeof dau === "object" && "tieuDe" in dau) return dau.tieuDe;
  }
  return duPhong;
}

export function layDanhSach(nd: NoiDungKhoi, khoa: string, duPhong: string[]): string[] {
  const v = nd[khoa];
  if (Array.isArray(v)) {
    const ra = v
      .map((x) => (typeof x === "string" ? x : x && typeof x === "object" && "tieuDe" in x ? `${x.tieuDe} — ${x.than}` : ""))
      .map((x) => x.trim())
      .filter(Boolean);
    if (ra.length > 0) return ra;
  }
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return duPhong;
}

/**
 * "Tiêu đề — thân" → hai phần. Model rất hay trả một chuỗi thay vì một cặp,
 * kể cả khi lời nhắc nói rõ khuôn.
 *
 * ⚠️ MỘT CHỖ DUY NHẤT. Bản đầu tách ở `layMuc` (lúc sinh mã) nhưng KHÔNG tách
 * ở bộ đọc chữ của #27 — nên cùng một câu ra hai kết quả khác nhau tuỳ đi
 * đường nào, và JSON lưu lại thì nhét cả câu vào tiêu đề.
 */
export function tachTieuDeThan(s: string): MucNoiDung {
  const tach = /^([^]{2,80}?)\s*(?:—|--|:)\s*([^]+)$/.exec(s.trim());
  return tach ? { tieuDe: tach[1]!.trim(), than: tach[2]!.trim() } : { tieuDe: s.trim(), than: "" };
}

export function layMuc(nd: NoiDungKhoi, khoa: string, duPhong: MucNoiDung[]): MucNoiDung[] {
  const v = nd[khoa];
  if (Array.isArray(v)) {
    const ra = v
      .map((x): MucNoiDung | null => {
        if (typeof x === "string") return tachTieuDeThan(x);
        if (x && typeof x === "object" && "tieuDe" in x) {
          return { tieuDe: String(x.tieuDe).trim(), than: String(x.than ?? "").trim() };
        }
        return null;
      })
      .filter((x): x is MucNoiDung => Boolean(x?.tieuDe));
    if (ra.length > 0) return ra;
  }
  return duPhong;
}

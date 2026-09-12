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
  zalo: string;
  /** Trang trong website: để khối điều hướng dựng menu. */
  trang: ReadonlyArray<{ duong: string; tieuDe: string }>;
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

export function layMuc(nd: NoiDungKhoi, khoa: string, duPhong: MucNoiDung[]): MucNoiDung[] {
  const v = nd[khoa];
  if (Array.isArray(v)) {
    const ra = v
      .map((x): MucNoiDung | null => {
        if (typeof x === "string") {
          // "Tiêu đề — thân" hoặc "Tiêu đề: thân" — khuôn model hay trả về.
          // `[^]` thay cho cờ `s`: đích biên dịch của kho là ES2017 nên cờ
          // `s` (dotAll) không dùng được — xem lỗi TS1501.
          const tach = /^([^]{2,80}?)\s*(?:—|--|:)\s*([^]+)$/.exec(x.trim());
          return tach ? { tieuDe: tach[1]!.trim(), than: tach[2]!.trim() } : { tieuDe: x.trim(), than: "" };
        }
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

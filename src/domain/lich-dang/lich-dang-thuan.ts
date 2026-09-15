/* ══════════════════════════════════════════════════════════════════════════
   LỊCH ĐĂNG — PHẦN THUẦN KHÔNG ZOD (tách khỏi `lich-dang.ts` ngày 16/09/2026)

   ⚠️ TỆP NÀY KHÔNG ĐƯỢC IMPORT GIÁ TRỊ TỪ BẤT KỲ MÔ-ĐUN NÀO CÓ ZOD.

   Vì sao: `lich-dang.ts` định nghĩa lược đồ zod ngay đầu tệp, nên client
   component nào import MỘT giá trị bất kỳ từ đó (một hằng số, một hàm tách
   dòng) cũng kéo nguyên thư viện zod xuống trình duyệt. Đo trên bản build: gói
   zod 285 KB thô / 64 KB nén đi kèm `/bat-dau` và `/projects/[projectId]` —
   hai trang không kiểm dữ liệu gì bằng zod ở phía trình duyệt.

   Mọi thứ ở đây vẫn được `lich-dang.ts` xuất lại, nên phía máy chủ và các phép
   thử giữ nguyên đường import cũ. Client component thì import thẳng từ đây.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Các bước của một lượt, theo thứ tự.
 *
 * Là luồng "Chuỗi bài viết → đẩy thẳng sang site" BỎ BƯỚC #13 (llms.txt /
 * sitemap / robots): bước đăng không đọc đầu ra của nó, và website đã tự sinh
 * mấy tệp đó. Giữ nó là thêm một lượt gọi AI mỗi ngày cho thứ không ai dùng.
 * Có bước #23 chọn ảnh kèm từ Drive (12/09) ngay trước bước đăng.
 * `tests/unit/lich-dang.test.ts` khoá danh sách này với `registry.ts`.
 */
export const BUOC_LICH_DANG = [
  "RIS_SITEMAP_KEYWORDS",
  "RIS_ICN_KEYWORDS",
  "RIS_ONPAGE_SEO",
  "RIS_CONTENT_HEADLINE",
  "RIS_CONTENT_INTRO",
  "RIS_CONTENT_SECTIONS",
  "RIS_GEO_SCHEMA",
  "RIS_CHON_ANH",
  "RIS_VHGG_PUBLISH",
] as const;

export const CHUYEN_MUC_LICH = ["Tiến độ", "Chính sách", "Sự kiện", "Thị trường"] as const;

export type NguonChuDe = "danh-sach" | "search-console";

/** Một lượt = một bài của một ngày. Ghi lúc bắt đầu; `ketQua` ghi lúc chốt. */
export interface LuotLich {
  ngay: string;
  /** Lần thứ mấy trong ngày — lịch tự chạy luôn là 0; "chạy lại hôm nay" bằng tay là 1, 2… */
  lan: number;
  chuDe: string;
  nguon: NguonChuDe;
  batDauLuc: string;
  ketQua?: "da-dang" | "dung" | "het-han";
  postUrl?: string;
  loi?: string;
  xongLuc?: string;
  /**
   * Lượt này là lượt VIẾT LẠI sau khi website từ chối bài: các dòng vi phạm
   * `[luat] “trích”` của lượt trước, được đưa vào lời nhắc để AI tránh.
   */
  suaVi?: string[];
}

/* ─────────────────────────── Giờ Việt Nam ─────────────────────────────── */

// Việt Nam không đổi giờ theo mùa — lệch cố định +7.
const LECH_VN_MS = 7 * 3_600_000;

export function ngayVN(luc: Date): string {
  return new Date(luc.getTime() + LECH_VN_MS).toISOString().slice(0, 10);
}

export function gioVN(luc: Date): number {
  return new Date(luc.getTime() + LECH_VN_MS).getUTCHours();
}

export function congNgay(ngay: string, soNgay: number): string {
  const d = new Date(`${ngay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + soNgay);
  return d.toISOString().slice(0, 10);
}

/* ─────────────────────────── Chủ đề ───────────────────────────────────── */

export function chuanHoaChuDe(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Tách danh sách chủ đề từ ô nhập nhiều dòng: bỏ dòng trống, bỏ trùng. */
export function tachDanhSachChuDe(vanBan: string): string[] {
  const daCo = new Set<string>();
  const ra: string[] = [];
  for (const dong of vanBan.split(/\r?\n/)) {
    const chuDe = dong.replace(/\s+/g, " ").trim();
    const khoa = chuanHoaChuDe(chuDe);
    if (!khoa || daCo.has(khoa)) continue;
    daCo.add(khoa);
    ra.push(chuDe);
  }
  return ra;
}

/**
 * Hai chủ đề có gần như trùng không — tỉ lệ chữ chung (Jaccard) ≥ 0,6.
 *
 * Chỉ dùng cho chủ đề lấy từ Search Console. "giá vinhomes hạ long xanh 2026"
 * và "vinhomes hạ long xanh giá 2026" là CÙNG một bài; viết cả hai là hai trang
 * tự tranh nhau một truy vấn, và là đúng mẫu "scaled content abuse" Google nêu.
 */
export function giongNhau(a: string, b: string): boolean {
  const x = new Set(chuanHoaChuDe(a).split(" ").filter(Boolean));
  const y = new Set(chuanHoaChuDe(b).split(" ").filter(Boolean));
  if (x.size === 0 || y.size === 0) return false;
  let chung = 0;
  for (const chu of x) if (y.has(chu)) chung += 1;
  return chung / (x.size + y.size - chung) >= 0.6;
}

/* ─────────────────────────── Tiến độ một bước ─────────────────────────── */

export type TrangThaiBuoc = "chua-chay" | "dang-chay" | "xong" | "hong";

export interface BuocTienDo {
  moduleKey: string;
  trangThai: TrangThaiBuoc;
  lan: 0 | 1;
  jobId?: string;
  loi?: string;
  /** Lần job đổi trạng thái gần nhất — để thấy một bước "đang chạy" đã đứng bao lâu. */
  capNhatLuc?: string;
}

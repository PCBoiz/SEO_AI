import type { HeThietKe } from "./he-thiet-ke";

/**
 * FONT TỰ LƯU TRONG WEBSITE KHÁCH — phần THUẦN.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO
 *
 * Bản đầu nạp font bằng `<link rel="stylesheet" href="https://fonts.googleapis.com/…">`.
 * Lighthouse điện thoại 13/09 đo trên website mẫu: chính tệp CSS đó CHẶN HIỂN
 * THỊ ~850 ms (thêm một lượt DNS + TLS sang Google trước khi vẽ được chữ nào),
 * LCP 3,8 giây.
 *
 * `next/font/google` giải được chuyện đó, nhưng nó tải font LÚC BUILD — máy
 * dựng không ra được mạng là build gãy (lý do bản đầu tránh nó). Cách ở đây:
 * Antigravity tải font LÚC SINH MÃ (nơi luôn có mạng), ghi thẳng tệp `.woff2`
 * vào `public/fonts/` và khối `@font-face` vào `globals.css`. Website sinh ra
 * không cần Google lúc build lẫn lúc xem.
 *
 * Tải hỏng (mạng chập, Google đổi định dạng) → không có `FontChoWeb` → bộ sinh
 * mã quay về thẻ `<link>` như cũ. Chậm hơn, nhưng không bao giờ ra một trang
 * mất font.
 *
 * Giấy phép: mọi font trong `FONT_TIENG_VIET` đều lấy từ Google Fonts (OFL hoặc
 * Apache 2.0) — được phép lưu và phân phối kèm website.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Vùng ký tự giữ lại: website tiếng Việt không cần cyrillic, greek, math… */
export const SUBSET_GIU: readonly string[] = ["vietnamese", "latin-ext", "latin"];

export interface MatFont {
  family: string;
  style: string;
  weight: string;
  /** Tên vùng ký tự Google ghi trong chú thích ngay trên khối (`vietnamese`, `latin`…). */
  subset: string;
  url: string;
  unicodeRange: string;
}

export interface TepFont {
  /** Tên tệp trong `public/fonts/`. */
  ten: string;
  bytes: Buffer;
}

export interface FontChoWeb {
  /** Các khối `@font-face` trỏ vào `/fonts/<tên>` — chép thẳng vào globals.css. */
  css: string;
  tep: TepFont[];
  /** Tệp nên `<link rel="preload">`: độ đậm 400 của font tiêu đề và font thân, vùng latin + vietnamese. */
  taiTruoc: string[];
}

const hoTen = (ten: string): string => encodeURIComponent(ten).replace(/%20/g, "+");

/**
 * Địa chỉ CSS Google Fonts cho một hệ thiết kế — dùng chung cho thẻ `<link>`
 * dự phòng và cho việc tải font về. Độ đậm khớp CSS của bộ sinh mã: tiêu đề
 * 400/600, thân 400/500/600.
 */
export function urlGoogleFont(tk: Pick<HeThietKe, "font">): string {
  const { tieuDe, than } = tk.font;
  // Cùng một họ cho tiêu đề và thân (bộ phòng hờ dùng Be Vietnam Pro cho cả
  // hai): gộp vào MỘT tham số — khai một họ hai lần là thừa.
  if (tieuDe === than) {
    return `https://fonts.googleapis.com/css2?family=${hoTen(than)}:wght@400;500;600&display=swap`;
  }
  return `https://fonts.googleapis.com/css2?family=${hoTen(tieuDe)}:wght@400;600&family=${hoTen(than)}:wght@400;500;600&display=swap`;
}

const HO_FONT_HOP_LE = /^[A-Za-z0-9 ]{1,60}$/;
const VUNG_KY_TU_HOP_LE = /^[Uu+0-9A-Fa-f?,\s-]{1,4000}$/;

/**
 * Đọc CSS Google Fonts (bản cho trình duyệt hiện đại — woff2, chia vùng ký tự).
 *
 * Mỗi khối `@font-face` đứng sau một chú thích tên vùng ký tự. Khối nào thiếu
 * trường, sai dạng, hoặc trỏ ra ngoài `fonts.gstatic.com` thì bỏ: nội dung này
 * đến từ mạng và sẽ được chép vào CSS của website khách, nên chỉ nhận đúng thứ
 * mình biết.
 */
export function docCssGoogleFont(css: string): MatFont[] {
  const ra: MatFont[] = [];
  for (const m of css.matchAll(/\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
    const than = m[2] ?? "";
    const lay = (re: RegExp): string | undefined => re.exec(than)?.[1]?.trim();
    const family = lay(/font-family:\s*['"]?([^;'"]+)['"]?\s*;/);
    const style = lay(/font-style:\s*([a-z]+)\s*;/) ?? "normal";
    const weight = lay(/font-weight:\s*(\d{3}(?:\s+\d{3})?)\s*;/);
    const url = lay(/src:\s*url\(\s*['"]?(https:\/\/fonts\.gstatic\.com\/[^'")\s]+\.woff2)['"]?\s*\)\s*format\(\s*['"]woff2['"]\s*\)/);
    const unicodeRange = lay(/unicode-range:\s*([^;]+);/);
    if (!family || !HO_FONT_HOP_LE.test(family)) continue;
    if (!weight || !url || !unicodeRange || !VUNG_KY_TU_HOP_LE.test(unicodeRange)) continue;
    if (style !== "normal" && style !== "italic") continue;
    ra.push({ family, style, weight, subset: m[1] ?? "", url, unicodeRange });
  }
  return ra;
}

/** `be-vietnam-pro-vietnamese-3f9a1c0b2d.woff2` — mã băm nội dung nên cache vĩnh viễn an toàn. */
export function tenTepFont(family: string, subset: string, bam: string): string {
  const ho = family.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${ho}-${subset}-${bam.slice(0, 10)}.woff2`;
}

/** Khối `@font-face` trỏ vào tệp tự lưu, giữ nguyên thứ tự Google trả về. */
export function cssFontTuLuu(mat: ReadonlyArray<MatFont & { ten: string }>): string {
  return mat
    .map(
      (f) => `/* ${f.subset} */
@font-face {
  font-family: ${JSON.stringify(f.family)};
  font-style: ${f.style};
  font-weight: ${f.weight};
  font-display: swap;
  src: url(/fonts/${f.ten}) format("woff2");
  unicode-range: ${f.unicodeRange};
}`,
    )
    .join("\n");
}

/**
 * Ghép kết quả sau khi đã tải tệp: lọc vùng ký tự, gộp tệp trùng (font biến
 * thiên — hai độ đậm dùng CÙNG một tệp), đặt tên theo mã băm, chọn tệp tải
 * trước.
 *
 * `taiVe`: địa chỉ gốc → nội dung + mã băm sha256 (hex).
 */
export function ghepFontChoWeb(
  mat: readonly MatFont[],
  taiVe: ReadonlyMap<string, { bytes: Buffer; bam: string }>,
  tk: Pick<HeThietKe, "font">,
): FontChoWeb | null {
  const giu = mat.filter((f) => SUBSET_GIU.includes(f.subset));
  if (giu.length === 0) return null;

  const tenTheoUrl = new Map<string, string>();
  const tep: TepFont[] = [];
  const coTen: Array<MatFont & { ten: string }> = [];
  for (const f of giu) {
    const du = taiVe.get(f.url);
    // Thiếu MỘT tệp là bỏ cả bộ: nửa câu tiếng Việt rơi về font hệ thống giữa
    // chừng còn khó coi hơn cả trang dùng font dự phòng.
    if (!du) return null;
    let ten = tenTheoUrl.get(f.url);
    if (!ten) {
      ten = tenTepFont(f.family, f.subset, du.bam);
      tenTheoUrl.set(f.url, ten);
      const tenMoi = ten;
      if (!tep.some((t) => t.ten === tenMoi)) tep.push({ ten: tenMoi, bytes: du.bytes });
    }
    coTen.push({ ...f, ten });
  }

  const taiTruoc = [
    ...new Set(
      coTen
        .filter(
          (f) =>
            f.weight === "400" &&
            f.style === "normal" &&
            (f.subset === "latin" || f.subset === "vietnamese") &&
            (f.family === tk.font.tieuDe || f.family === tk.font.than),
        )
        .map((f) => f.ten),
    ),
  ].slice(0, 4);

  return { css: cssFontTuLuu(coTen), tep, taiTruoc };
}

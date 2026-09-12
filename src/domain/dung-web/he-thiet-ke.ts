import { z } from "zod";
import type { FormatIssue } from "@/domain/modules/generate-with-retry";
import { docJson } from "./doc-json";

/**
 * HỆ THIẾT KẾ — token màu, cặp font, khoảng cách, góc bo.
 *
 * Bước 3 của trình dựng web. Đầu ra là một JSON nhỏ, kiểm được ở code:
 *   · màu là mã hex 6 số;
 *   · font lấy từ DANH SÁCH ĐÓNG — toàn bộ là Google Fonts CÓ BỘ CHỮ TIẾNG
 *     VIỆT (dấu, chữ đ). Model rất hay đề xuất font đẹp nhưng thiếu dấu, và
 *     lỗi đó chỉ lộ ra khi trang đã dựng xong: "Hạ Long" thành "H? Long";
 *   · độ tương phản chữ/nền ≥ 4,5 (WCAG AA cho chữ thường) — tính thật, không
 *     hỏi model.
 */

/** Google Fonts có subset `vietnamese`, kiểm tay 09/2026. Tên đúng như trên fonts.google.com. */
export const FONT_TIENG_VIET = [
  "Inter",
  "Inter Tight",
  "Be Vietnam Pro",
  "Manrope",
  "Lexend",
  "DM Sans",
  "Plus Jakarta Sans",
  "Space Grotesk",
  "Work Sans",
  "Public Sans",
  "Sora",
  "Archivo",
  "Bricolage Grotesque",
  "Roboto",
  "Open Sans",
  "Source Sans 3",
  "Nunito",
  "Noto Sans",
  "Noto Serif",
  "Lora",
  "Literata",
  "Merriweather",
  "Playfair Display",
  "Fraunces",
  "Cormorant Garamond",
  "Josefin Sans",
  "Montserrat",
  "Raleway",
  "Oswald",
  "Anton",
] as const;

const mauHex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Màu phải là mã hex 6 số, ví dụ #0b1f1a");

const fontHopLe = z
  .string()
  .trim()
  .refine((f) => (FONT_TIENG_VIET as readonly string[]).includes(f), {
    message: `Font phải nằm trong danh sách có tiếng Việt: ${FONT_TIENG_VIET.join(", ")}`,
  });

export const heThietKeSchema = z
  .object({
    mau: z
      .object({
        nen: mauHex,
        chu: mauHex,
        /** Màu nhấn: nút chính, liên kết, số liệu nổi. */
        nhan: mauHex,
        /** Màu phụ: nhãn nhỏ, viền, khối thứ cấp. */
        phu: mauHex,
      })
      .strict(),
    font: z.object({ tieuDe: fontHopLe, than: fontHopLe }).strict(),
    khoangCach: z.enum(["thoang", "vua", "chat"]),
    goc: z.enum(["vuong", "bo-nhe", "tron"]),
    /** 2–4 tính từ mô tả cảm giác — để bước viết chữ giữ cùng giọng. */
    giong: z.array(z.string().trim().min(1).max(40)).min(2).max(4),
    lyDo: z.string().trim().min(1).max(600),
  })
  .strict();

export type HeThietKe = z.infer<typeof heThietKeSchema>;

/* ── Tương phản WCAG ─────────────────────────────────────────────────────── */

function kenh(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function doSang(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * kenh((n >> 16) & 255) + 0.7152 * kenh((n >> 8) & 255) + 0.0722 * kenh(n & 255);
}

/** Tỉ lệ tương phản WCAG giữa hai màu hex (1–21). */
export function tuongPhan(a: string, b: string): number {
  const [s, t] = [doSang(a), doSang(b)].sort((x, y) => y - x) as [number, number];
  return (s + 0.05) / (t + 0.05);
}

export const TUONG_PHAN_TOI_THIEU = 4.5;

export function kiemHeThietKe(text: string): FormatIssue[] {
  const du = docJson(text);
  if (du === null) return [{ message: "Không đọc được JSON — trả về đúng MỘT khối JSON, không chữ nào ngoài khối." }];
  const kq = heThietKeSchema.safeParse(du);
  if (!kq.success) {
    return kq.error.issues.slice(0, 5).map((i) => ({ message: `${i.path.join(".") || "gốc"}: ${i.message}` }));
  }
  const loi: FormatIssue[] = [];
  const tp = tuongPhan(kq.data.mau.nen, kq.data.mau.chu);
  if (tp < TUONG_PHAN_TOI_THIEU) {
    loi.push({ message: `Chữ ${kq.data.mau.chu} trên nền ${kq.data.mau.nen} chỉ tương phản ${tp.toFixed(1)}:1 — cần ≥ ${TUONG_PHAN_TOI_THIEU}:1. Đổi màu chữ hoặc nền.` });
  }
  const tpNhan = tuongPhan(kq.data.mau.nen, kq.data.mau.nhan);
  if (tpNhan < 3) {
    loi.push({ message: `Màu nhấn ${kq.data.mau.nhan} trên nền ${kq.data.mau.nen} chỉ ${tpNhan.toFixed(1)}:1 — cần ≥ 3:1 để nút/liên kết nhìn thấy.` });
  }
  return loi;
}

export function docHeThietKe(text: string): HeThietKe | null {
  const du = docJson(text);
  if (du === null) return null;
  const kq = heThietKeSchema.safeParse(du);
  return kq.success ? kq.data : null;
}

export function moTaHeThietKe(h: HeThietKe): string {
  return [
    `Màu: nền ${h.mau.nen} · chữ ${h.mau.chu} (tương phản ${tuongPhan(h.mau.nen, h.mau.chu).toFixed(1)}:1) · nhấn ${h.mau.nhan} · phụ ${h.mau.phu}`,
    `Font: tiêu đề ${h.font.tieuDe} · thân ${h.font.than} (cả hai có bộ chữ tiếng Việt)`,
    `Khoảng cách: ${{ thoang: "thoáng", vua: "vừa", chat: "chặt" }[h.khoangCach]} · Góc: ${{ vuong: "vuông", "bo-nhe": "bo nhẹ", tron: "tròn" }[h.goc]}`,
    `Giọng: ${h.giong.join(", ")}`,
    "",
    h.lyDo,
  ].join("\n");
}

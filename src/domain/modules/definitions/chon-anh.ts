import { z } from "zod";
import type { AnhTrongDrive, ModuleDefinition } from "@/domain/modules/module-definition";
import { moduleJobBaseShape } from "@/domain/modules/module-job";

/* ══════════════════════════════════════════════════════════════════════════
   MODULE ẨN · Chọn ảnh kèm bài từ thư mục Drive của dự án

   Chủ dự án (11/09): "về sau tôi gửi ảnh lên Drive thì bạn lấy luôn để cập
   nhật/đăng bài". Website từ 12/09 nhận tối đa 2 ảnh kèm bài. Mắt xích còn
   thiếu là CHỌN ẢNH NÀO — và đó là việc của module này.

   Cách chọn: liệt kê ảnh trong thư mục (tên tệp + mô tả từ `danh-sach-anh.csv`
   nếu có), đưa danh sách ĐÁNH SỐ cho AI cùng tiêu đề/chủ đề bài, AI trả về số.
   Đầu ra được KIỂM lại theo danh sách: số không có trong danh sách thì bỏ.
   AI chỉ được chọn, không được "nhớ ra" một ảnh không tồn tại — cùng nguyên
   tắc "chọn-và-ghép từ danh mục" của trình dựng website.

   KHÔNG có ảnh phù hợp thì trả rỗng — website tự lấy ảnh theo chuyên mục như
   trước. Chọn bừa còn tệ hơn không chọn: ảnh sân golf trong bài về pháp lý là
   thứ người đọc nhận ra ngay.

   Đầu ra dạng text `id | tên | alt` mỗi dòng — bước đăng đọc lại đúng khuôn
   này qua ngữ cảnh nối luồng (đầu ra module được làm phẳng thành text).
   ══════════════════════════════════════════════════════════════════════════ */

export const SO_ANH_TOI_DA = 2;

const inputSchema = z
  .object({
    ...moduleJobBaseShape,
    primaryKeyword: z.string().trim().min(1, "Thiếu chủ đề bài.").max(240),
    /** Để trống thì lấy tiêu đề đầu tiên từ module tiêu đề (nối luồng). */
    tieuDe: z.string().trim().max(300).default(""),
  })
  .strict();
export type ChonAnhInput = z.infer<typeof inputSchema>;

const outputSchema = z
  .object({
    contractVersion: z.literal("1.0"),
    /** Mỗi dòng `id | tên | alt`; rỗng = không kèm ảnh. */
    danhSach: z.string(),
    ghiChu: z.string().min(1),
  })
  .strict();
export type ChonAnhOutput = z.infer<typeof outputSchema>;

/** Một dòng đầu ra ↔ một ảnh. Bước đăng dùng lại đúng hàm này để đọc. */
export function docDongAnh(danhSach: string): Array<{ id: string; ten: string; alt: string }> {
  return danhSach
    .split(/\r?\n/)
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => d.split(" | "))
    .filter((p) => p.length >= 3 && /^[A-Za-z0-9_-]{15,}$/.test(p[0]!))
    .map((p) => ({ id: p[0]!, ten: p[1]!, alt: p.slice(2).join(" | ").trim() }))
    .slice(0, SO_ANH_TOI_DA);
}

export function ghiDongAnh(anh: Array<{ id: string; ten: string; alt: string }>): string {
  // Dấu | là ký tự phân cách của dòng — trong tên/alt thì thay đi, và gộp khoảng trắng.
  return anh
    .map((a) => `${a.id} | ${a.ten.replace(/\|/g, "/")} | ${a.alt.replace(/[\r\n|]+/g, " ").replace(/\s+/g, " ").trim()}`)
    .join("\n");
}

/** Tên tệp → chữ đọc được: "song-le-hoi-ben-du-thuyen.webp" → "song le hoi ben du thuyen". */
function tenDep(ten: string): string {
  return ten.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
}

/**
 * Bỏ bản trùng giữa thư mục gốc và thư mục ảnh gốc chất lượng cao: cùng tên
 * (bỏ đuôi) thì giữ bản ở GỐC — bản đã tối ưu cho web. Ảnh gốc 2560px để dành
 * cho lúc cần in.
 */
export function locUngVien(anh: readonly AnhTrongDrive[]): AnhTrongDrive[] {
  const theoTen = new Map<string, AnhTrongDrive>();
  for (const a of anh) {
    const khoa = tenDep(a.ten).toLowerCase();
    const cu = theoTen.get(khoa);
    if (!cu || (cu.thuMucCon !== "" && a.thuMucCon === "")) theoTen.set(khoa, a);
  }
  return [...theoTen.values()];
}

function firstHeadline(text: string | undefined): string {
  if (!text) return "";
  const dong = text
    .split(/\r?\n/)
    .map((d) => d.replace(/^#+\s*/, "").replace(/^\s*(?:\d+[.)]|[-*•])\s+/, "").trim())
    .filter((d) => d && !/^##\s/.test(d) && !/^[A-ZÀ-Ỹ ]{4,}:?$/.test(d));
  return dong[0] ?? "";
}

export const chonAnhModule: ModuleDefinition<ChonAnhInput, ChonAnhOutput> = {
  key: "RIS_CHON_ANH",
  moduleNumber: 23,
  title: "Chọn ảnh kèm bài từ Drive",
  description:
    "Chọn tối đa 2 ảnh trong thư mục Drive của dự án hợp với bài (AI chọn từ danh sách, không sinh ảnh). Không có ảnh hợp thì bài dùng ảnh theo chuyên mục của website.",
  category: "Content",
  an: true,
  inputSchema,
  outputSchema,
  requiresAi: true,
  needsDrive: true,
  form: [
    { key: "primaryKeyword", label: "Chủ đề bài", type: "text", required: true },
    { key: "tieuDe", label: "Tiêu đề bài (tùy chọn)", type: "text" },
  ],
  outputBlocks: [
    { key: "danhSach", label: "Ảnh đã chọn" },
    { key: "ghiChu", label: "Ghi chú" },
  ],
  consumes: ["RIS_CONTENT_HEADLINE"],
  async execute({ input, generate, upstream, drive }) {
    if (!drive) {
      return {
        contractVersion: "1.0",
        danhSach: "",
        ghiChu: "Dự án chưa nối thư mục Google Drive (hoặc token Google của người nối đã hết hạn) — bài dùng ảnh theo chuyên mục của website.",
      };
    }
    const tatCa = await drive.lietKe();
    const ungVien = locUngVien(tatCa).slice(0, 120);
    if (ungVien.length === 0) {
      return { contractVersion: "1.0", danhSach: "", ghiChu: "Thư mục Drive chưa có ảnh nào." };
    }

    const tieuDe = input.tieuDe.trim() || firstHeadline(upstream.RIS_CONTENT_HEADLINE) || input.primaryKeyword;
    const dong = ungVien.map(
      (a, i) => `#${i + 1} | ${tenDep(a.ten)}${a.thuMucCon ? ` | thư mục: ${a.thuMucCon}` : ""}${a.moTa ? ` | mô tả: ${a.moTa}` : ""}`,
    );

    const tho = await generate({
      systemPrompt: [
        "Bạn chọn ảnh minh hoạ cho một bài viết bất động sản từ MỘT DANH SÁCH CÓ SẴN. Bạn không được bịa ảnh, không được mô tả thứ không có trong tên/mô tả ảnh.",
        "Chỉ trả về JSON đúng dạng: {\"chon\":[{\"so\":<số thứ tự>,\"alt\":\"<mô tả ngắn ≤120 ký tự, tiếng Việt, đúng những gì tên/mô tả ảnh nói>\"}]}.",
        `Tối đa ${SO_ANH_TOI_DA} ảnh. Ảnh đầu tiên là ảnh bìa — phải hợp CHỦ ĐỀ CHÍNH của bài nhất. Không có ảnh hợp thì trả {"chon":[]}.`,
        "Không chọn ảnh sơ đồ/mặt bằng làm bìa trừ khi bài nói về mặt bằng. Không chọn hai ảnh cùng một cảnh.",
      ].join("\n"),
      prompt: [
        `Tiêu đề bài: ${tieuDe}`,
        `Chủ đề/từ khoá: ${input.primaryKeyword}`,
        "",
        "Danh sách ảnh (số | tên | thư mục | mô tả):",
        ...dong,
        "",
        "Trả về JSON.",
      ].join("\n"),
      maxOutputTokens: 400,
    });

    const chon = docLuaChon(tho, ungVien.length);
    const anh = chon
      .map((c) => {
        const a = ungVien[c.so - 1]!;
        // Alt: ưu tiên mô tả người viết trong CSV; AI chỉ điền khi thiếu.
        const alt = (a.moTa ?? c.alt ?? tenDep(a.ten)).trim().slice(0, 200);
        return { id: a.id, ten: a.ten, alt };
      })
      .slice(0, SO_ANH_TOI_DA);

    return {
      contractVersion: "1.0",
      danhSach: ghiDongAnh(anh),
      ghiChu:
        anh.length === 0
          ? `Xét ${ungVien.length} ảnh, không tấm nào hợp bài "${tieuDe}" — bài dùng ảnh theo chuyên mục của website.`
          : `Chọn ${anh.length}/${ungVien.length} ảnh cho bài "${tieuDe}": ${anh.map((a) => a.ten).join(", ")}. Ảnh đầu là ảnh bìa.`,
    };
  },
};

/** Đọc JSON của AI một cách bao dung: bỏ ``` bao ngoài, số phải nằm trong 1..n, không trùng. */
export function docLuaChon(tho: string, n: number): Array<{ so: number; alt?: string }> {
  const sach = tho.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
  const dau = sach.indexOf("{");
  const cuoi = sach.lastIndexOf("}");
  if (dau === -1 || cuoi === -1) return [];
  let du: { chon?: unknown };
  try {
    du = JSON.parse(sach.slice(dau, cuoi + 1)) as { chon?: unknown };
  } catch {
    return [];
  }
  if (!Array.isArray(du.chon)) return [];
  const daCo = new Set<number>();
  const ra: Array<{ so: number; alt?: string }> = [];
  for (const m of du.chon) {
    const so = typeof m === "number" ? m : typeof m === "object" && m !== null ? Number((m as { so?: unknown }).so) : NaN;
    if (!Number.isInteger(so) || so < 1 || so > n || daCo.has(so)) continue;
    daCo.add(so);
    const alt = typeof m === "object" && m !== null && typeof (m as { alt?: unknown }).alt === "string" ? (m as { alt: string }).alt : undefined;
    ra.push({ so, alt });
    if (ra.length >= SO_ANH_TOI_DA) break;
  }
  return ra;
}

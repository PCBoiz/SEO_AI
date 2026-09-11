import { z } from "zod";
import type { ModuleDefinition } from "@/domain/modules/module-definition";
import { moduleJobBaseShape } from "@/domain/modules/module-job";
import { combineValidators, noListMarkers, noPreamble } from "@/domain/modules/generate-with-retry";
import { upstreamBlock } from "@/domain/modules/definitions/shared";

/* ══════════════════════════════════════════════════════════════════════════
   MODULE ẨN · "AI viết hộ" một ô nhập liệu

   Chủ dự án (12/09/2026): mọi ô nhập — trên form module, trang Quy trình, thẻ
   lịch đăng… — nên có nút để AI viết hộ bằng khoá API của chính người dùng,
   được chọn nhà cung cấp, và PHẢI GIỮ LỊCH SỬ để không thích thì quay về bản
   cũ.

   VÌ SAO LÀ MỘT MODULE chứ không phải một route gọi AI trực tiếp: mỗi lần "viết
   hộ" thành một job → có sẵn khoá BYOK theo người dùng, gọi lại khi sai định
   dạng, lỗi nhà cung cấp đã được làm sạch, và LỊCH SỬ nằm trong bảng job như
   mọi đầu ra khác (đúng lý do chủ dự án từng đòi lịch sử đầu ra từng module).
   Bản trước khi AI viết đè lên nằm trong `input.giaTriHienTai` — quay về được.
   Không cần migration.

   ẨN khỏi danh mục module (`an: true`): nó không phải một "việc" để người dùng
   chọn chạy, mà là một cái nút cạnh ô nhập.
   ══════════════════════════════════════════════════════════════════════════ */

export const LOAI_O = ["van-ban", "danh-sach"] as const;

const inputSchema = z
  .object({
    ...moduleJobBaseShape,
    /** Khoá của ô — để lọc lịch sử theo ô. */
    truong: z.string().trim().min(1).max(80),
    nhan: z.string().trim().min(1).max(200),
    moTa: z.string().trim().max(600).default(""),
    loai: z.enum(LOAI_O).default("van-ban"),
    giaTriHienTai: z.string().max(8_000).default(""),
    /** Người dùng gõ thêm: "ngắn hơn", "nhấn vào pháp lý"… */
    goiY: z.string().trim().max(1_000).default(""),
    /** Các ô khác trên cùng form + thông tin dự án — để AI viết đúng ngữ cảnh. */
    boiCanh: z.record(z.string().max(80), z.string().max(4_000)).default({}),
    gioiHanKyTu: z.number().int().min(1).max(8_000).optional(),
    gioiHanMuc: z.number().int().min(1).max(300).optional(),
  })
  .strict();
export type VietHoInput = z.infer<typeof inputSchema>;

const outputSchema = z
  .object({
    contractVersion: z.literal("1.0"),
    noiDung: z.string().min(1),
  })
  .strict();
export type VietHoOutput = z.infer<typeof outputSchema>;

/**
 * Gợi ý riêng cho các ô hay gặp. Khoá = tên ô trong form module / trang Quy
 * trình / thẻ lịch đăng. Ô không có trong bảng thì AI dựa vào nhãn + mô tả.
 */
const GOI_Y_THEO_O: Record<string, string> = {
  audienceBrief:
    "Viết 2–4 câu: doanh nghiệp là ai và bán gì, khách mục tiêu là ai, họ quan tâm điều gì nhất khi quyết định. Giọng mô tả, không quảng cáo, không tính từ sáo.",
  chuDe:
    "Liệt kê 6–10 chủ đề bài viết CỤ THỂ theo đúng câu người mua hay hỏi (giá, pháp lý, tiến độ, so sánh, kinh nghiệm). Mỗi dòng tối đa 14 chữ, không trùng ý nhau, không có dấu chấm cuối dòng.",
  primaryKeyword:
    "Một cụm từ khoá 3–8 chữ đúng cách người tìm gõ vào Google. Chữ thường, trừ tên riêng. Không giải thích.",
  pageLabel: "Tên trang hoặc tiêu đề mục tiêu, tối đa 8 chữ.",
  angle: "Một góc nhìn cho bài, đúng một câu, nói rõ bài này khác các bài cùng chủ đề ở chỗ nào.",
  headline: "Một tiêu đề duy nhất, tối đa 70 ký tự, chứa từ khoá chính, không dấu ngoặc kép.",
  title: "Một tiêu đề duy nhất, tối đa 70 ký tự, chứa từ khoá chính, không dấu ngoặc kép.",
  outline: "5–8 mục lớn cho bài (mỗi dòng một mục, như tiêu đề H2), theo thứ tự người đọc cần biết.",
  seedKeywords: "8–15 từ khoá hạt giống, mỗi dòng một từ khoá, chữ thường.",
  secondaryKeywords: "6–12 từ khoá phụ bám từ khoá chính, mỗi dòng một từ khoá, chữ thường.",
  sitemapLabels: "Tên các trang chính của website, mỗi dòng một trang, ngắn gọn.",
  tone: "3–6 chữ mô tả giọng văn (ví dụ: chuyên nghiệp, rõ ràng, không hoa mỹ).",
  location: "Thị trường hoặc địa điểm, ngắn gọn (ví dụ: Hạ Long, Quảng Ninh).",
  moTa: "Một đoạn mô tả ngắn 1–3 câu.",
};

function heThong(): string {
  return [
    "Bạn là trợ lý điền ô nhập liệu cho một công cụ SEO nội bộ. Người dùng đang ở một form và bấm “AI viết hộ” cho ĐÚNG MỘT ô.",
    "",
    "QUY TẮC ĐẦU RA — vi phạm là kết quả bị loại:",
    "1. Chỉ trả về NỘI DUNG CỦA Ô. Không lời dẫn, không giải thích, không tiêu đề, không dấu ngoặc kép bao ngoài, không markdown.",
    "2. Ô dạng DANH SÁCH: mỗi dòng một mục, không đánh số, không gạch đầu dòng, không dòng trống giữa các mục.",
    "3. Ô dạng VĂN BẢN: một hoặc vài đoạn văn xuôi, không xuống dòng thừa.",
    "4. Viết bằng ngôn ngữ ghi ở bối cảnh (mặc định tiếng Việt).",
    "5. KHÔNG BỊA SỐ LIỆU: giá, diện tích, số căn, pháp lý, tiến độ, ngày tháng, tên người. Chỉ dùng con số có trong bối cảnh; thiếu thì viết chung hoặc để [cần điền].",
    "6. Tôn trọng giới hạn độ dài và số mục nếu được nêu.",
    "7. Có sẵn nội dung hiện tại thì coi đó là bản nháp: giữ ý đúng, viết lại cho tốt hơn theo gợi ý. Gợi ý bảo đổi hướng thì đổi.",
    "8. Không nhắc tới chính mình, không hỏi lại. Nếu bối cảnh quá ít, vẫn viết bản dùng được, tránh khẳng định cụ thể.",
  ].join("\n");
}

function loaiTen(loai: VietHoInput["loai"]): string {
  return loai === "danh-sach" ? "DANH SÁCH (mỗi dòng một mục)" : "VĂN BẢN";
}

/** Bối cảnh: bỏ ô trống, cắt ô quá dài, ưu tiên các ô mô tả dự án lên đầu. */
function khoiBoiCanh(boiCanh: Record<string, string>, truong: string): string {
  const uuTien = ["siteName", "websiteUrl", "website", "industry", "location", "language", "tone", "audienceBrief", "primaryKeyword"];
  const dong = Object.entries(boiCanh)
    .filter(([k, v]) => k !== truong && v.trim())
    .sort(([a], [b]) => {
      const ia = uuTien.indexOf(a);
      const ib = uuTien.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map(([k, v]) => `- ${k}: ${v.trim().slice(0, 1_200)}`);
  return dong.length ? dong.join("\n") : "(không có)";
}

/** Dọn đầu ra: bỏ ngoặc bao ngoài, bỏ đánh số/gạch đầu dòng, gộp trùng, áp giới hạn. */
export function donDauRa(tho: string, input: Pick<VietHoInput, "loai" | "gioiHanKyTu" | "gioiHanMuc">): string {
  let t = tho.replace(/\r\n/g, "\n").trim();
  // Model hay bọc cả câu trả lời trong ``` hoặc "…".
  t = t.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
  if (/^["“][^\n]*["”]$/.test(t)) t = t.slice(1, -1).trim();

  if (input.loai === "danh-sach") {
    const daCo = new Set<string>();
    const muc: string[] = [];
    for (const dongTho of t.split("\n")) {
      let d = dongTho.replace(/^\s*(?:\d+[.)]|[-*•–])\s+/, "").trim();
      if (input.gioiHanKyTu && d.length > input.gioiHanKyTu) d = d.slice(0, input.gioiHanKyTu).trim();
      const khoa = d.toLowerCase();
      if (!d || daCo.has(khoa)) continue;
      daCo.add(khoa);
      muc.push(d);
    }
    return muc.slice(0, input.gioiHanMuc ?? muc.length).join("\n");
  }

  if (input.gioiHanKyTu && t.length > input.gioiHanKyTu) {
    // Cắt ở ranh giới câu gần nhất trước giới hạn, không cắt giữa chữ.
    const cat = t.slice(0, input.gioiHanKyTu);
    const cuoiCau = Math.max(cat.lastIndexOf(". "), cat.lastIndexOf("! "), cat.lastIndexOf("? "));
    const cuoiChu = cat.lastIndexOf(" ");
    // Câu ngắn còn hơn một câu cụt; chữ trọn còn hơn nửa chữ.
    t = (cuoiCau > 0 ? cat.slice(0, cuoiCau + 1) : cuoiChu > 0 ? cat.slice(0, cuoiChu) : cat).trim();
  }
  return t;
}

export const vietHoModule: ModuleDefinition<VietHoInput, VietHoOutput> = {
  key: "RIS_VIET_HO",
  moduleNumber: 22,
  title: "AI viết hộ ô nhập",
  description:
    "Viết hộ nội dung cho một ô trên form bằng khoá AI của bạn. Mỗi lần viết là một bản lưu — quay lại bản cũ bất cứ lúc nào.",
  category: "Content",
  an: true,
  inputSchema,
  outputSchema,
  form: [
    { key: "nhan", label: "Ô cần viết", type: "text", required: true },
    { key: "goiY", label: "Gợi ý cho AI", type: "text" },
  ],
  outputBlocks: [{ key: "noiDung", label: "Nội dung AI viết" }],
  consumes: ["RIS_SITE_SCAN", "RIS_SITEMAP_KEYWORDS", "RIS_ICN_KEYWORDS"],
  async execute({ input, generate, upstream }) {
    const goiYO = GOI_Y_THEO_O[input.truong];
    // Đầu ra module trước (nếu dự án đã chạy) là tài liệu tham khảo tốt nhất
    // cho chủ đề/từ khoá — nhưng cắt ngắn: đây là một ô nhập, không phải bài.
    const thamKhao = upstreamBlock(
      Object.fromEntries(Object.entries(upstream).map(([k, v]) => [k, v.slice(0, 1_500)])),
      [
        { key: "RIS_SITE_SCAN", label: "Website hiện có" },
        { key: "RIS_SITEMAP_KEYWORDS", label: "Kế hoạch từ khoá" },
        { key: "RIS_ICN_KEYWORDS", label: "Cụm chủ đề" },
      ],
    );

    const prompt = [
      `Ô cần viết: "${input.nhan}" — dạng ${loaiTen(input.loai)}.`,
      input.moTa ? `Mô tả ô: ${input.moTa}` : "",
      goiYO ? `Cách viết cho ô này: ${goiYO}` : "",
      input.gioiHanKyTu
        ? input.loai === "danh-sach"
          ? `Mỗi mục tối đa ${input.gioiHanKyTu} ký tự.`
          : `Tối đa ${input.gioiHanKyTu} ký tự.`
        : "",
      input.gioiHanMuc ? `Tối đa ${input.gioiHanMuc} mục.` : "",
      "",
      "Bối cảnh (các ô khác trên form và thông tin dự án):",
      khoiBoiCanh(input.boiCanh, input.truong),
      thamKhao,
      "",
      input.giaTriHienTai.trim()
        ? `Nội dung hiện tại của ô (bản nháp):\n${input.giaTriHienTai.trim().slice(0, 4_000)}`
        : "Ô hiện đang trống.",
      "",
      input.goiY ? `Gợi ý của người dùng: ${input.goiY}` : "Không có gợi ý thêm — viết bản tốt nhất theo bối cảnh.",
      "",
      "Trả về đúng nội dung của ô, không gì khác.",
    ]
      .filter((d) => d !== "")
      .join("\n");

    const tho = await generate({
      systemPrompt: heThong(),
      prompt,
      maxOutputTokens: input.loai === "danh-sach" ? 1_024 : 1_536,
      validate:
        input.loai === "danh-sach" ? combineValidators(noPreamble, noListMarkers) : noPreamble,
    });
    const noiDung = donDauRa(tho, input);
    if (!noiDung) throw new Error("AI trả về nội dung trống — thử lại hoặc thêm gợi ý.");
    return { contractVersion: "1.0", noiDung };
  },
};

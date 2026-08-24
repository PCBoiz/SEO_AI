import { z } from "zod";
import type { ModuleDefinition } from "@/domain/modules/module-definition";
import { moduleJobBaseShape } from "@/domain/modules/module-job";
import { seoGeoPreamble } from "@/domain/modules/seo-geo";
import {
  linesOrFallback,
  localizedContextLines,
  localizedFields,
  localizedShape,
  upstreamBlock,
} from "@/domain/modules/definitions/shared";

const researchSystem = (role: string) =>
  `${seoGeoPreamble}\n${role} Chỉ trả về nội dung được yêu cầu, không giải thích quy trình.`;

/* ───────────────────── Module 3 · ICN Keywords ───────────────────── */
// Internal Content Network: cụm chủ đề (pillar + cluster) và bản đồ liên kết nội bộ.

const icnInput = z
  .object({
    ...moduleJobBaseShape,
    ...localizedShape,
    primaryKeyword: z
      .string()
      .trim()
      .min(1, "Từ khóa/chủ đề chính không được để trống")
      .max(240),
    seedKeywords: z
      .array(z.string().trim().min(1).max(200))
      .max(200, "Tối đa 200 từ khóa nguồn")
      .default([]),
  })
  .strict();
export type IcnKeywordsInput = z.infer<typeof icnInput>;

const icnOutput = z
  .object({
    contractVersion: z.literal("1.0"),
    clusterPlan: z.string().min(1),
    geoPlan: z.string().min(1),
  })
  .strict();
export type IcnKeywordsOutput = z.infer<typeof icnOutput>;

export const icnKeywordsModule: ModuleDefinition<
  IcnKeywordsInput,
  IcnKeywordsOutput
> = {
  key: "RIS_ICN_KEYWORDS",
  moduleNumber: 3,
  title: "Từ khóa ICN (mạng nội dung)",
  description:
    "Xây mạng nội dung nội bộ: cụm chủ đề pillar + cluster và bản đồ liên kết nội bộ (SEO + GEO).",
  category: "Research",
  inputSchema: icnInput,
  outputSchema: icnOutput,
  form: [
    {
      key: "primaryKeyword",
      label: "Từ khóa / chủ đề chính",
      type: "text",
      required: true,
      placeholder: "Ví dụ: giáo dục lập trình",
    },
    ...localizedFields,
    {
      key: "seedKeywords",
      label: "Từ khóa nguồn (tùy chọn)",
      type: "textarea",
      rows: 5,
      asLines: true,
      description:
        "Tùy chọn — mỗi dòng một từ khóa, dán từ Module 2. Bỏ trống thì AI tự đề xuất.",
    },
  ],
  outputBlocks: [
    { key: "clusterPlan", label: "Cụm chủ đề & liên kết nội bộ" },
    { key: "geoPlan", label: "Kế hoạch GEO (AI search)" },
  ],
  consumes: ["RIS_SITE_SCAN", "RIS_SITEMAP_KEYWORDS"],
  async execute({ input, generate, upstream }) {
    const seeds = linesOrFallback(
      input.seedKeywords,
      "Không có từ khóa nguồn dán tay; ưu tiên dùng ngữ cảnh bên dưới hoặc tự đề xuất theo ngành.",
    );
    const context = upstreamBlock(upstream, [
      { key: "RIS_SITE_SCAN", label: "Website hiện có (Module 20)" },
      { key: "RIS_SITEMAP_KEYWORDS", label: "Từ khóa Sitemap (Module 2)" },
    ]);
    const clusterPlan = await generate({
      systemPrompt: researchSystem("Bạn là chuyên gia kiến trúc nội dung SEO."),
      prompt: [
        `Hãy xây mạng nội dung nội bộ (Internal Content Network) bằng ${input.language}.`,
        `Chủ đề chính: ${input.primaryKeyword}`,
        ...localizedContextLines(input),
        "",
        "Từ khóa nguồn:",
        seeds,
        context,
        "",
        "Trả về:",
        "1. 2–4 trang trụ (pillar) cho các chủ đề lớn.",
        "2. Với mỗi pillar: 4–8 bài cluster (chủ đề con) kèm từ khóa mục tiêu.",
        "3. Bản đồ liên kết nội bộ: cluster nên liên kết tới pillar nào và anchor text gợi ý.",
        "Trình bày rõ ràng theo từng pillar.",
      ].join("\n"),
      maxOutputTokens: 4_096,
    });
    const geoPlan = await generate({
      systemPrompt: researchSystem("Bạn là chuyên gia GEO."),
      prompt: [
        `Lập kế hoạch GEO bằng ${input.language} cho chủ đề "${input.primaryKeyword}" tại ${input.location}.`,
        ...localizedContextLines(input),
        "",
        "Trả về: (1) 8–12 câu hỏi người dùng hỏi trợ lý AI; (2) thực thể & dữ kiện cần nêu để AI trích dẫn; (3) 2–3 đoạn trả lời mẫu ngắn, tự chứa.",
      ].join("\n"),
      maxOutputTokens: 3_072,
    });
    return { contractVersion: "1.0", clusterPlan, geoPlan };
  },
};

/* ─────────────────── Module 4 · Imported Keywords ─────────────────── */
// Người dùng dán danh sách từ khóa thô (Ahrefs/Search Console) → làm sạch, gom
// nhóm theo chủ đề & ý định, xếp ưu tiên.

const importedInput = z
  .object({
    ...moduleJobBaseShape,
    ...localizedShape,
    primaryKeyword: z.string().trim().max(240).default(""),
    importedKeywords: z
      .array(z.string().trim().min(1).max(200))
      .min(1, "Cần ít nhất một từ khóa để phân loại")
      .max(500, "Tối đa 500 từ khóa"),
  })
  .strict();
export type ImportedKeywordsInput = z.infer<typeof importedInput>;

const importedOutput = z
  .object({
    contractVersion: z.literal("1.0"),
    organizedKeywords: z.string().min(1),
  })
  .strict();
export type ImportedKeywordsOutput = z.infer<typeof importedOutput>;

export const importedKeywordsModule: ModuleDefinition<
  ImportedKeywordsInput,
  ImportedKeywordsOutput
> = {
  key: "RIS_IMPORTED_KEYWORDS",
  moduleNumber: 4,
  title: "Từ khóa đã nhập",
  description:
    "Làm sạch, gom nhóm theo chủ đề & ý định tìm kiếm và xếp ưu tiên danh sách từ khóa bạn dán vào.",
  category: "Research",
  inputSchema: importedInput,
  outputSchema: importedOutput,
  form: [
    {
      key: "primaryKeyword",
      label: "Từ khóa trọng tâm (tùy chọn)",
      type: "text",
      placeholder: "Để trống nếu không có trọng tâm cụ thể",
    },
    ...localizedFields,
    {
      key: "importedKeywords",
      label: "Danh sách từ khóa (bắt buộc)",
      type: "textarea",
      required: true,
      rows: 8,
      asLines: true,
      description: "Mỗi dòng một từ khóa — dán từ Ahrefs, Search Console, v.v.",
    },
  ],
  outputBlocks: [
    { key: "organizedKeywords", label: "Từ khóa đã gom nhóm & xếp ưu tiên" },
  ],
  async execute({ input, generate }) {
    const focus =
      input.primaryKeyword.trim().length > 0
        ? `Từ khóa trọng tâm: ${input.primaryKeyword}`
        : "Không có trọng tâm cụ thể; ưu tiên theo giá trị SEO tổng thể.";
    const organizedKeywords = await generate({
      systemPrompt: researchSystem("Bạn là chuyên gia nghiên cứu từ khóa."),
      prompt: [
        `Hãy sắp xếp danh sách từ khóa dưới đây bằng ${input.language}.`,
        focus,
        ...localizedContextLines(input),
        "",
        "Danh sách từ khóa:",
        input.importedKeywords.map((kw) => `- ${kw}`).join("\n"),
        "",
        "Trả về:",
        "1. Loại bỏ trùng lặp và từ khóa không liên quan (nêu rõ đã bỏ nhóm nào).",
        "2. Gom nhóm theo chủ đề, và trong mỗi nhóm phân theo ý định (informational / commercial / transactional / navigational).",
        "3. Đánh dấu mức ưu tiên (Cao / Trung bình / Thấp) dựa trên mức độ liên quan tới doanh nghiệp và tiềm năng chuyển đổi.",
        "Trình bày dạng nhóm rõ ràng, không bịa số liệu tìm kiếm.",
      ].join("\n"),
      maxOutputTokens: 4_096,
    });
    return { contractVersion: "1.0", organizedKeywords };
  },
};

/* ───────────────────── Module 5 · On-Page SEO ───────────────────── */

const onpageInput = z
  .object({
    ...moduleJobBaseShape,
    ...localizedShape,
    primaryKeyword: z
      .string()
      .trim()
      .min(1, "Từ khóa mục tiêu không được để trống")
      .max(240),
    pageLabel: z
      .string()
      .trim()
      .min(1, "Tên/loại trang không được để trống")
      .max(160),
    secondaryKeywords: z
      .array(z.string().trim().min(1).max(200))
      .max(50, "Tối đa 50 từ khóa phụ")
      .default([]),
  })
  .strict();
export type OnPageSeoInput = z.infer<typeof onpageInput>;

const onpageOutput = z
  .object({
    contractVersion: z.literal("1.0"),
    onPagePlan: z.string().min(1),
    geoSnippet: z.string().min(1),
  })
  .strict();
export type OnPageSeoOutput = z.infer<typeof onpageOutput>;

export const onPageSeoModule: ModuleDefinition<OnPageSeoInput, OnPageSeoOutput> =
  {
    key: "RIS_ONPAGE_SEO",
    moduleNumber: 5,
    title: "On-Page SEO",
    description:
      "Kế hoạch On-Page cho một trang: title, meta, cấu trúc heading, slug, internal link, schema + đoạn trả lời GEO.",
    category: "SEO",
    inputSchema: onpageInput,
    outputSchema: onpageOutput,
    form: [
      {
        key: "pageLabel",
        label: "Trang cần tối ưu",
        type: "text",
        required: true,
        placeholder: "Ví dụ: Khóa học lập trình cho trẻ em",
      },
      {
        key: "primaryKeyword",
        label: "Từ khóa mục tiêu",
        type: "text",
        required: true,
        placeholder: "Ví dụ: khóa học lập trình cho trẻ",
      },
      ...localizedFields,
      {
        key: "secondaryKeywords",
        label: "Từ khóa phụ (tùy chọn)",
        type: "textarea",
        rows: 4,
        asLines: true,
        description: "Tùy chọn — mỗi dòng một từ khóa, dán từ Module 2/3.",
      },
    ],
    outputBlocks: [
      { key: "onPagePlan", label: "Kế hoạch On-Page SEO" },
      { key: "geoSnippet", label: "Đoạn trả lời GEO (AI search)" },
    ],
    consumes: ["RIS_SITE_SCAN", "RIS_SITEMAP_KEYWORDS", "RIS_ICN_KEYWORDS"],
    async execute({ input, generate, upstream }) {
      const secondary = linesOrFallback(
        input.secondaryKeywords,
        "Không có từ khóa phụ dán tay; dùng ngữ cảnh bên dưới hoặc tự đề xuất biến thể.",
      );
      const context = upstreamBlock(upstream, [
        { key: "RIS_SITE_SCAN", label: "Website hiện có (Module 20)" },
        { key: "RIS_SITEMAP_KEYWORDS", label: "Từ khóa Sitemap (Module 2)" },
        { key: "RIS_ICN_KEYWORDS", label: "Mạng nội dung ICN (Module 3)" },
      ]);
      const onPagePlan = await generate({
        systemPrompt: researchSystem("Bạn là chuyên gia On-Page SEO."),
        prompt: [
          `Hãy lập kế hoạch On-Page SEO bằng ${input.language} cho trang "${input.pageLabel}".`,
          `Từ khóa mục tiêu: ${input.primaryKeyword}`,
          ...localizedContextLines(input),
          "",
          "Từ khóa phụ:",
          secondary,
          context,
          "",
          "Trả về:",
          "1. Title tag (≤60 ký tự) và Meta description (≤155 ký tự).",
          "2. Slug URL gợi ý.",
          "3. Cấu trúc heading: H1, các H2/H3 kèm ý chính từng phần.",
          "4. Gợi ý liên kết nội bộ (anchor + trang đích) và 1–2 loại schema phù hợp.",
          "5. Ghi chú mật độ/biến thể từ khóa tự nhiên (không nhồi nhét).",
        ].join("\n"),
        maxOutputTokens: 4_096,
      });
      const geoSnippet = await generate({
        systemPrompt: researchSystem("Bạn là chuyên gia GEO."),
        prompt: [
          `Viết 2–3 đoạn trả lời GEO bằng ${input.language} cho trang "${input.pageLabel}" (chủ đề ${input.primaryKeyword}).`,
          ...localizedContextLines(input),
          "",
          "Mỗi đoạn: trả lời trực tiếp một câu hỏi người dùng thường hỏi trợ lý AI, ngắn gọn, tự chứa, nêu rõ thực thể/số liệu để AI dễ trích dẫn.",
        ].join("\n"),
        maxOutputTokens: 2_048,
      });
      return { contractVersion: "1.0", onPagePlan, geoSnippet };
    },
  };

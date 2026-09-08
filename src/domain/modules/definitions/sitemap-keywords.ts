import { z } from "zod";
import type { ModuleDefinition } from "@/domain/modules/module-definition";
import { moduleJobBaseShape } from "@/domain/modules/module-job";
import { seoGeoPreamble } from "@/domain/modules/seo-geo";

// Module 2 · Từ khóa Sitemap (RIS 3.5 #2). Nhận nhãn sitemap (từ Module 1, hoặc
// người dùng tự dán để chạy đơn lẻ) và sinh bộ từ khóa SEO + kế hoạch GEO.

const inputSchema = z
  .object({
    ...moduleJobBaseShape,
    primaryKeyword: z
      .string()
      .trim()
      .min(1, "Từ khóa/chủ đề chính không được để trống")
      .max(240),
    language: z
      .string()
      .trim()
      .min(1, "Ngôn ngữ đầu ra không được để trống")
      .max(80),
    location: z
      .string()
      .trim()
      .min(1, "Thị trường/địa điểm không được để trống")
      .max(160),
    audienceBrief: z
      .string()
      .trim()
      .min(10, "Mô tả doanh nghiệp/khách hàng cần ít nhất 10 ký tự")
      .max(8_000),
    // Nhãn sitemap từ Module 1. Tùy chọn: để trống thì suy luận theo chủ đề.
    sitemapLabels: z
      .array(z.string().trim().min(1).max(200))
      .max(60, "Tối đa 60 nhãn sitemap")
      .default([]),
  })
  .strict();

export type SitemapKeywordsInput = z.infer<typeof inputSchema>;

const outputSchema = z
  .object({
    contractVersion: z.literal("1.0"),
    keywordPlan: z.string().min(1),
    geoPlan: z.string().min(1),
  })
  .strict();

export type SitemapKeywordsOutput = z.infer<typeof outputSchema>;

const keywordSystemPrompt = `${seoGeoPreamble()}\nBạn là chuyên gia nghiên cứu từ khóa. Chỉ trả về kế hoạch từ khóa, không giải thích quy trình và không đánh số danh sách khi không cần.`;

const geoSystemPrompt = `${seoGeoPreamble()}\nBạn là chuyên gia GEO. Chỉ trả về kế hoạch GEO, không giải thích quy trình.`;

function buildKeywordPrompt(input: SitemapKeywordsInput): string {
  const labels =
    input.sitemapLabels.length > 0
      ? input.sitemapLabels.map((label) => `- ${label}`).join("\n")
      : "Không có nhãn sitemap được cung cấp; hãy tự đề xuất các nhóm trang/chủ đề chuẩn theo ngành dựa trên chủ đề chính.";
  return [
    `Hãy lập kế hoạch từ khóa bằng ${input.language} cho website thuộc thị trường ${input.location}.`,
    `Chủ đề/từ khóa chính: ${input.primaryKeyword}`,
    `Bối cảnh doanh nghiệp và khách hàng mục tiêu: ${input.audienceBrief}`,
    "",
    "Các nhóm trang/nhãn sitemap cần bao phủ:",
    labels,
    "",
    "Với TỪNG nhóm trang ở trên, hãy đưa ra:",
    "1. Từ khóa chính (primary keyword) và ý định tìm kiếm (informational / commercial / transactional / navigational).",
    "2. 3–6 từ khóa phụ (secondary) liên quan chặt chẽ.",
    "3. 3–6 từ khóa dài (long-tail) dạng câu hỏi hoặc cụm dài mà người dùng thực sự tìm.",
    "Trình bày rõ ràng theo từng nhóm trang, dễ đọc. Dùng đúng thuật ngữ bản địa, không bịa số liệu tìm kiếm.",
  ].join("\n");
}

function buildGeoPrompt(input: SitemapKeywordsInput): string {
  return [
    `Hãy lập kế hoạch GEO bằng ${input.language} cho chủ đề "${input.primaryKeyword}" tại thị trường ${input.location}.`,
    `Bối cảnh doanh nghiệp và khách hàng mục tiêu: ${input.audienceBrief}`,
    "",
    "Trả về các phần sau:",
    "1. Câu hỏi người dùng thường đặt cho trợ lý AI (ChatGPT, Gemini, Perplexity) về chủ đề này — 8–12 câu hỏi tự nhiên.",
    "2. Thực thể & dữ kiện cần nêu rõ để AI dễ trích dẫn (tên thương hiệu/sản phẩm, đặc điểm, con số nếu có, định nghĩa).",
    "3. Gợi ý đoạn trả lời mẫu (answer snippet) ngắn, trực tiếp, tự chứa cho 2–3 câu hỏi quan trọng nhất — sao cho AI có thể trích dẫn nguyên văn.",
    "Bám sát ngôn ngữ và thị trường, giọng điệu đáng tin cậy (E-E-A-T).",
  ].join("\n");
}

export const sitemapKeywordsModule: ModuleDefinition<
  SitemapKeywordsInput,
  SitemapKeywordsOutput
> = {
  key: "RIS_SITEMAP_KEYWORDS",
  moduleNumber: 2,
  title: "Từ khóa Sitemap",
  description:
    "Sinh bộ từ khóa SEO và kế hoạch GEO từ nhãn sitemap (dán từ Module 1 hoặc để trống).",
  category: "Research",
  inputSchema,
  outputSchema,
  form: [
    {
      key: "primaryKeyword",
      label: "Từ khóa / chủ đề chính",
      type: "text",
      required: true,
      placeholder: "Ví dụ: giáo dục lập trình",
    },
    {
      key: "location",
      label: "Thị trường / địa điểm",
      type: "text",
      required: true,
      prefillFromProject: "location",
    },
    {
      key: "language",
      label: "Ngôn ngữ đầu ra",
      type: "text",
      required: true,
      prefillFromProject: "language",
    },
    {
      key: "audienceBrief",
      label: "Mô tả doanh nghiệp / khách hàng",
      type: "textarea",
      required: true,
      rows: 4,
    },
    {
      key: "sitemapLabels",
      label: "Nhãn sitemap (tùy chọn)",
      type: "textarea",
      rows: 5,
      asLines: true,
      description:
        "Tùy chọn — mỗi dòng một nhãn, dán từ Module 1. Bỏ trống thì AI tự suy luận.",
    },
  ],
  outputBlocks: [
    { key: "keywordPlan", label: "Kế hoạch từ khóa (SEO)" },
    { key: "geoPlan", label: "Kế hoạch GEO (AI search)" },
  ],
  async execute({ input, generate }) {
    const keywordPlan = await generate({
      systemPrompt: keywordSystemPrompt,
      prompt: buildKeywordPrompt(input),
      maxOutputTokens: 4_096,
    });
    const geoPlan = await generate({
      systemPrompt: geoSystemPrompt,
      prompt: buildGeoPrompt(input),
      maxOutputTokens: 3_072,
    });
    return { contractVersion: "1.0", keywordPlan, geoPlan };
  },
};

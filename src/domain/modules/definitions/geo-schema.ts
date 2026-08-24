import { z } from "zod";
import type { ModuleDefinition } from "@/domain/modules/module-definition";
import { moduleJobBaseShape } from "@/domain/modules/module-job";
import { seoGeoPreamble } from "@/domain/modules/seo-geo";
import {
  localizedContextLines,
  localizedFields,
  localizedShape,
  upstreamBlock,
} from "@/domain/modules/definitions/shared";

// Module 11 · Giáp GEO (FAQ + JSON-LD). Đòn bẩy GEO mạnh nhất 2026: FAQ khớp câu
// hỏi người dùng + schema JSON-LD để AI/công cụ tìm kiếm trích dẫn. Chạy sau nội
// dung (tự dùng ngữ cảnh bài viết) hoặc đơn lẻ theo chủ đề.

const geoSchemaInput = z
  .object({
    ...moduleJobBaseShape,
    ...localizedShape,
    primaryKeyword: z
      .string()
      .trim()
      .min(1, "Từ khóa/chủ đề chính không được để trống")
      .max(240),
    pageUrl: z.string().trim().max(2_048).default(""),
  })
  .strict();
export type GeoSchemaInput = z.infer<typeof geoSchemaInput>;

const geoSchemaOutput = z
  .object({
    contractVersion: z.literal("1.0"),
    faq: z.string().min(1),
    jsonLd: z.string().min(1),
  })
  .strict();
export type GeoSchemaOutput = z.infer<typeof geoSchemaOutput>;

const system = (role: string) =>
  `${seoGeoPreamble}\n${role} Chỉ trả về nội dung được yêu cầu, không giải thích thêm.`;

export const geoSchemaModule: ModuleDefinition<GeoSchemaInput, GeoSchemaOutput> =
  {
    key: "RIS_GEO_SCHEMA",
    moduleNumber: 11,
    title: "Giáp GEO (FAQ + JSON-LD)",
    description:
      "Sinh FAQ khớp câu hỏi người dùng và mã JSON-LD (FAQPage + Article) để AI/search trích dẫn.",
    category: "SEO",
    inputSchema: geoSchemaInput,
    outputSchema: geoSchemaOutput,
    form: [
      {
        key: "primaryKeyword",
        label: "Từ khóa / chủ đề",
        type: "text",
        required: true,
        placeholder: "Ví dụ: học lập trình cho người mới",
      },
      ...localizedFields,
      {
        key: "pageUrl",
        label: "URL trang (tùy chọn)",
        type: "text",
        placeholder: "https://... — để nhúng vào schema nếu có",
      },
    ],
    outputBlocks: [
      { key: "faq", label: "FAQ khớp câu hỏi (GEO)" },
      { key: "jsonLd", label: "Mã JSON-LD (dán vào <head>)" },
    ],
    consumes: [
      "RIS_SITE_SCAN",
      "RIS_CONTENT_SECTIONS",
      "RIS_CONTENT_INTRO",
      "RIS_ONPAGE_SEO",
      "RIS_SITEMAP_KEYWORDS",
    ],
    async execute({ input, generate, upstream }) {
      const context = upstreamBlock(upstream, [
        { key: "RIS_SITE_SCAN", label: "Website hiện có (Module 20)" },
        { key: "RIS_CONTENT_SECTIONS", label: "Thân bài (Module 10)" },
        { key: "RIS_CONTENT_INTRO", label: "Mở đầu (Module 8)" },
        { key: "RIS_ONPAGE_SEO", label: "On-Page SEO (Module 5)" },
        { key: "RIS_SITEMAP_KEYWORDS", label: "Từ khóa (Module 2)" },
      ]);
      const faq = await generate({
        systemPrompt: system("Bạn là chuyên gia GEO."),
        prompt: [
          `Tạo FAQ bằng ${input.language} cho chủ đề "${input.primaryKeyword}".`,
          ...localizedContextLines(input),
          context,
          "",
          "Yêu cầu: 6–10 cặp Hỏi–Đáp. Câu hỏi bám đúng cách người dùng hỏi trợ lý AI; câu trả lời trực tiếp, tự chứa, 2–4 câu, nêu thực thể/số liệu để dễ trích dẫn. Định dạng: 'Hỏi: ...' và 'Đáp: ...'.",
        ].join("\n"),
        maxOutputTokens: 2_560,
      });
      const jsonLd = await generate({
        systemPrompt: system(
          "Bạn là kỹ sư SEO kỹ thuật, thành thạo schema.org JSON-LD.",
        ),
        prompt: [
          "Từ FAQ dưới đây, hãy tạo mã JSON-LD hợp lệ gồm hai schema: FAQPage (nhúng toàn bộ cặp Hỏi–Đáp) và Article (headline theo chủ đề, inLanguage đúng ngôn ngữ).",
          input.pageUrl.trim().length > 0
            ? `URL trang: ${input.pageUrl}`
            : "Không có URL cụ thể; dùng placeholder \"https://example.com\".",
          `Chủ đề: ${input.primaryKeyword}`,
          "",
          "FAQ:",
          faq,
          "",
          "Chỉ trả về khối mã JSON-LD (bọc trong <script type=\"application/ld+json\"> ... </script>), không giải thích.",
        ].join("\n"),
        maxOutputTokens: 2_560,
      });
      return { contractVersion: "1.0", faq, jsonLd };
    },
  };

import { z } from "zod";
import type { ModuleDefinition } from "@/domain/modules/module-definition";
import { moduleJobBaseShape } from "@/domain/modules/module-job";
import { seoGeoPreamble } from "@/domain/modules/seo-geo";
import {
  combineValidators,
  noPreamble,
  startsWithHeading,
} from "@/domain/modules/generate-with-retry";
import {
  geoExtractionGuidance,
  localizedContextLines,
  localizedFields,
  localizedShape,
  upstreamBlock,
} from "@/domain/modules/definitions/shared";

const contentSystem = (role: string) =>
  `${seoGeoPreamble()}\n${role} Viết tự nhiên, đúng ngôn ngữ và thị trường yêu cầu. Chỉ trả về nội dung được yêu cầu, không giải thích quy trình.`;

const toneField = {
  key: "tone",
  label: "Giọng văn",
  type: "text" as const,
  required: true,
  prefillFromProject: "tone" as const,
  placeholder: "Ví dụ: Chuyên nghiệp, cuốn hút",
};

const toneShape = {
  tone: z.string().trim().min(1, "Giọng văn không được để trống").max(120),
} as const;

/* ───────────────────── Module 6 · Home Page Content ───────────────────── */

const homeInput = z
  .object({
    ...moduleJobBaseShape,
    ...localizedShape,
    ...toneShape,
    primaryKeyword: z
      .string()
      .trim()
      .min(1, "Từ khóa chính không được để trống")
      .max(240),
    keyPoints: z
      .array(z.string().trim().min(1).max(300))
      .max(20, "Tối đa 20 điểm nhấn")
      .default([]),
  })
  .strict();
export type HomepageInput = z.infer<typeof homeInput>;

const homeOutput = z
  .object({
    contractVersion: z.literal("1.0"),
    homepageContent: z.string().min(1),
  })
  .strict();
export type HomepageOutput = z.infer<typeof homeOutput>;

export const homepageModule: ModuleDefinition<HomepageInput, HomepageOutput> = {
  key: "RIS_HOMEPAGE_CONTENT",
  moduleNumber: 6,
  title: "Nội dung trang chủ",
  description:
    "Viết toàn bộ nội dung trang chủ (hero, các khối, CTA) tối ưu SEO + GEO.",
  category: "Content",
  inputSchema: homeInput,
  outputSchema: homeOutput,
  form: [
    {
      key: "primaryKeyword",
      label: "Từ khóa chính",
      type: "text",
      required: true,
      placeholder: "Ví dụ: giáo dục lập trình",
    },
    toneField,
    ...localizedFields,
    {
      key: "keyPoints",
      label: "Điểm nhấn (tùy chọn)",
      type: "textarea",
      rows: 4,
      asLines: true,
      description: "Tùy chọn — mỗi dòng một điểm mạnh/USP muốn nêu.",
    },
  ],
  outputBlocks: [{ key: "homepageContent", label: "Nội dung trang chủ" }],
  consumes: ["RIS_SITE_SCAN", "RIS_SITEMAP_KEYWORDS", "RIS_ICN_KEYWORDS"],
  async execute({ input, generate, upstream }) {
    const points =
      input.keyPoints.length > 0
        ? input.keyPoints.map((point) => `- ${point}`).join("\n")
        : "Không có điểm nhấn cụ thể; hãy tự nêu bật giá trị cốt lõi phù hợp.";
    const context = upstreamBlock(upstream, [
      { key: "RIS_SITE_SCAN", label: "Website hiện có (Module 20)" },
      { key: "RIS_SITEMAP_KEYWORDS", label: "Từ khóa Sitemap (Module 2)" },
      { key: "RIS_ICN_KEYWORDS", label: "Mạng nội dung ICN (Module 3)" },
    ]);
    const homepageContent = await generate({
      systemPrompt: contentSystem("Bạn là copywriter web chuyên SEO."),
      prompt: [
        `Viết nội dung trang chủ hoàn chỉnh bằng ${input.language}, giọng ${input.tone}.`,
        `Từ khóa chính: ${input.primaryKeyword}`,
        ...localizedContextLines(input),
        "",
        "Điểm nhấn cần thể hiện:",
        points,
        context,
        "",
        geoExtractionGuidance,
        "",
        "Cấu trúc: (1) Hero — tiêu đề + phụ đề + CTA; (2) 3–5 khối nội dung (dịch vụ/giá trị/lý do chọn/bằng chứng tin cậy); (3) khối FAQ ngắn dạng câu hỏi–trả lời trực tiếp (tốt cho GEO); (4) CTA cuối. Viết nội dung thật, không mô tả bố cục.",
        "",
        "QUAN TRỌNG: vào thẳng nội dung, không viết câu dẫn nhập nào ở đầu.",
      ].join("\n"),
      maxOutputTokens: 4_096,
      validate: noPreamble,
    });
    return { contractVersion: "1.0", homepageContent };
  },
};

/* ───────────────────── Module 7 · Content Headline ───────────────────── */

const headlineInput = z
  .object({
    ...moduleJobBaseShape,
    ...localizedShape,
    ...toneShape,
    primaryKeyword: z
      .string()
      .trim()
      .min(1, "Từ khóa chính không được để trống")
      .max(240),
    angle: z.string().trim().max(240).default(""),
  })
  .strict();
export type HeadlineInput = z.infer<typeof headlineInput>;

const headlineOutput = z
  .object({
    contractVersion: z.literal("1.0"),
    headlines: z.string().min(1),
  })
  .strict();
export type HeadlineOutput = z.infer<typeof headlineOutput>;

export const headlineModule: ModuleDefinition<HeadlineInput, HeadlineOutput> = {
  key: "RIS_CONTENT_HEADLINE",
  moduleNumber: 7,
  title: "Tiêu đề nội dung",
  description:
    "Tạo nhiều phương án tiêu đề (title) chuẩn SEO + GEO cho một bài viết.",
  category: "Content",
  inputSchema: headlineInput,
  outputSchema: headlineOutput,
  form: [
    {
      key: "primaryKeyword",
      label: "Từ khóa / chủ đề bài viết",
      type: "text",
      required: true,
      placeholder: "Ví dụ: học lập trình cho người mới",
    },
    toneField,
    {
      key: "angle",
      label: "Góc tiếp cận (tùy chọn)",
      type: "text",
      placeholder: "Ví dụ: dành cho phụ huynh, so sánh online vs offline",
    },
    ...localizedFields,
  ],
  outputBlocks: [{ key: "headlines", label: "Phương án tiêu đề" }],
  consumes: ["RIS_SITE_SCAN", "RIS_SITEMAP_KEYWORDS", "RIS_ICN_KEYWORDS"],
  async execute({ input, generate, upstream }) {
    const angle =
      input.angle.trim().length > 0
        ? `Góc tiếp cận ưu tiên: ${input.angle}`
        : "Không có góc tiếp cận cố định; hãy đa dạng góc nhìn.";
    const context = upstreamBlock(upstream, [
      { key: "RIS_SITE_SCAN", label: "Website hiện có (Module 20)" },
      { key: "RIS_SITEMAP_KEYWORDS", label: "Từ khóa Sitemap (Module 2)" },
      { key: "RIS_ICN_KEYWORDS", label: "Mạng nội dung ICN (Module 3)" },
    ]);
    const headlines = await generate({
      systemPrompt: contentSystem("Bạn là chuyên gia đặt tiêu đề SEO."),
      prompt: [
        `Đề xuất 10 tiêu đề bài viết bằng ${input.language}, giọng ${input.tone}.`,
        `Từ khóa/chủ đề: ${input.primaryKeyword}`,
        angle,
        ...localizedContextLines(input),
        context,
        "",
        "Yêu cầu: mỗi tiêu đề chứa hoặc bám sát từ khóa, hấp dẫn, ≤65 ký tự. Xen kẽ dạng how-to, danh sách, câu hỏi (dạng câu hỏi tốt cho GEO). Với mỗi tiêu đề, ghi ngắn gọn lý do/ý định phù hợp.",
        "",
        "QUAN TRỌNG: vào thẳng danh sách, không viết câu dẫn nhập nào ở đầu.",
      ].join("\n"),
      maxOutputTokens: 2_048,
      validate: noPreamble,
    });
    return { contractVersion: "1.0", headlines };
  },
};

/* ───────────────────── Module 8 · Content Intro ───────────────────── */

const introInput = z
  .object({
    ...moduleJobBaseShape,
    ...localizedShape,
    ...toneShape,
    primaryKeyword: z
      .string()
      .trim()
      .min(1, "Từ khóa chính không được để trống")
      .max(240),
    headline: z.string().trim().max(240).default(""),
  })
  .strict();
export type IntroInput = z.infer<typeof introInput>;

const introOutput = z
  .object({
    contractVersion: z.literal("1.0"),
    intro: z.string().min(1),
  })
  .strict();
export type IntroOutput = z.infer<typeof introOutput>;

export const introModule: ModuleDefinition<IntroInput, IntroOutput> = {
  key: "RIS_CONTENT_INTRO",
  moduleNumber: 8,
  title: "Phần mở đầu",
  description:
    "Viết đoạn mở đầu bài viết theo lối trả lời-trước (answer-first) chuẩn SEO + GEO.",
  category: "Content",
  inputSchema: introInput,
  outputSchema: introOutput,
  form: [
    {
      key: "primaryKeyword",
      label: "Từ khóa / chủ đề bài viết",
      type: "text",
      required: true,
      placeholder: "Ví dụ: học lập trình cho người mới",
    },
    {
      key: "headline",
      label: "Tiêu đề bài viết (tùy chọn)",
      type: "text",
      placeholder: "Dán từ Module 7 nếu có",
    },
    toneField,
    ...localizedFields,
  ],
  outputBlocks: [{ key: "intro", label: "Phần mở đầu" }],
  consumes: ["RIS_SITE_SCAN", "RIS_CONTENT_HEADLINE", "RIS_ONPAGE_SEO"],
  async execute({ input, generate, upstream }) {
    const headline =
      input.headline.trim().length > 0
        ? `Tiêu đề bài viết: ${input.headline}`
        : "Chưa có tiêu đề dán tay; nếu có ngữ cảnh tiêu đề bên dưới thì bám theo, nếu không thì theo chủ đề chính.";
    const context = upstreamBlock(upstream, [
      { key: "RIS_SITE_SCAN", label: "Website hiện có (Module 20)" },
      { key: "RIS_CONTENT_HEADLINE", label: "Tiêu đề (Module 7)" },
      { key: "RIS_ONPAGE_SEO", label: "On-Page SEO (Module 5)" },
    ]);
    const intro = await generate({
      systemPrompt: contentSystem("Bạn là biên tập viên nội dung SEO."),
      prompt: [
        `Viết phần mở đầu (2–3 đoạn) cho bài viết bằng ${input.language}, giọng ${input.tone}.`,
        `Chủ đề/từ khóa: ${input.primaryKeyword}`,
        headline,
        ...localizedContextLines(input),
        context,
        "",
        "Yêu cầu: câu đầu trả lời trực tiếp ý định tìm kiếm (answer-first, tốt cho GEO), nêu bật giá trị bài viết, dẫn dắt tự nhiên, chèn từ khóa chính một cách mượt mà.",
        "",
        "QUAN TRỌNG: vào thẳng đoạn mở đầu, không viết câu dẫn nhập nào ở đầu.",
      ].join("\n"),
      maxOutputTokens: 1_536,
      validate: noPreamble,
    });
    return { contractVersion: "1.0", intro };
  },
};

/* ───────────────────── Module 10 · Content Sections ───────────────────── */

const sectionsInput = z
  .object({
    ...moduleJobBaseShape,
    ...localizedShape,
    ...toneShape,
    primaryKeyword: z
      .string()
      .trim()
      .min(1, "Từ khóa chính không được để trống")
      .max(240),
    headline: z.string().trim().max(240).default(""),
    outline: z
      .array(z.string().trim().min(1).max(300))
      .max(30, "Tối đa 30 mục dàn ý")
      .default([]),
  })
  .strict();
export type SectionsInput = z.infer<typeof sectionsInput>;

const sectionsOutput = z
  .object({
    contractVersion: z.literal("1.0"),
    sections: z.string().min(1),
  })
  .strict();
export type SectionsOutput = z.infer<typeof sectionsOutput>;

export const sectionsModule: ModuleDefinition<SectionsInput, SectionsOutput> = {
  key: "RIS_CONTENT_SECTIONS",
  moduleNumber: 10,
  title: "Các phần nội dung",
  description:
    "Viết thân bài đầy đủ theo dàn ý (H2/H3 + đoạn văn) tối ưu SEO + GEO.",
  category: "Content",
  inputSchema: sectionsInput,
  outputSchema: sectionsOutput,
  form: [
    {
      key: "primaryKeyword",
      label: "Từ khóa / chủ đề bài viết",
      type: "text",
      required: true,
      placeholder: "Ví dụ: học lập trình cho người mới",
    },
    {
      key: "headline",
      label: "Tiêu đề bài viết (tùy chọn)",
      type: "text",
      placeholder: "Dán từ Module 7 nếu có",
    },
    toneField,
    ...localizedFields,
    {
      key: "outline",
      label: "Dàn ý / các mục H2 (tùy chọn)",
      type: "textarea",
      rows: 5,
      asLines: true,
      description: "Tùy chọn — mỗi dòng một mục. Bỏ trống thì AI tự lập dàn ý.",
    },
  ],
  outputBlocks: [{ key: "sections", label: "Thân bài" }],
  consumes: ["RIS_SITE_SCAN", "RIS_CONTENT_HEADLINE", "RIS_ONPAGE_SEO", "RIS_ICN_KEYWORDS"],
  async execute({ input, generate, upstream }) {
    const outline =
      input.outline.length > 0
        ? input.outline.map((item) => `- ${item}`).join("\n")
        : "Không có dàn ý dán tay; dùng ngữ cảnh bên dưới hoặc tự lập dàn ý 4–7 mục H2.";
    const headline =
      input.headline.trim().length > 0
        ? `Tiêu đề bài viết: ${input.headline}`
        : "Chưa có tiêu đề dán tay; bám ngữ cảnh tiêu đề nếu có, nếu không theo chủ đề chính.";
    const context = upstreamBlock(upstream, [
      { key: "RIS_SITE_SCAN", label: "Website hiện có (Module 20)" },
      { key: "RIS_CONTENT_HEADLINE", label: "Tiêu đề (Module 7)" },
      { key: "RIS_ONPAGE_SEO", label: "On-Page SEO (Module 5)" },
      { key: "RIS_ICN_KEYWORDS", label: "Mạng nội dung ICN (Module 3)" },
    ]);
    const sections = await generate({
      systemPrompt: contentSystem("Bạn là cây viết nội dung SEO chuyên sâu."),
      prompt: [
        `Viết thân bài hoàn chỉnh bằng ${input.language}, giọng ${input.tone}.`,
        `Chủ đề/từ khóa: ${input.primaryKeyword}`,
        headline,
        ...localizedContextLines(input),
        context,
        "",
        "Dàn ý:",
        outline,
        "",
        geoExtractionGuidance,
        "",
        "Yêu cầu: mỗi mục có heading H2 (dùng ## ) và nội dung chi tiết; dùng H3, danh sách hoặc bảng khi phù hợp. Chèn từ khóa tự nhiên, không nhồi nhét, không bịa số liệu.",
        "",
        "QUAN TRỌNG: bắt đầu NGAY bằng heading '## ' đầu tiên. Không viết bất kỳ câu dẫn nhập nào trước đó (không 'Dưới đây là…', không 'Đây là bài viết…').",
      ].join("\n"),
      maxOutputTokens: 4_096,
      // Model nào lỡ thêm câu dẫn sẽ được nhắc và gọi lại một lần — áp dụng
      // như nhau cho mọi provider, không cần prompt riêng từng bên.
      validate: combineValidators(noPreamble, startsWithHeading),
    });
    return { contractVersion: "1.0", sections };
  },
};

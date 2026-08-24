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

// Module 18 · Tái chế nội dung đa định dạng (Tier A, thuần AI trên engine). Biến
// một bài viết thành nhiều bề mặt phân phối — thread X/Threads, carousel
// LinkedIn/IG, tóm tắt newsletter, caption Facebook ngắn. Đòn bẩy GEO: nội dung
// hiện diện ở nhiều nền tảng → nhiều bề mặt nhắc thương hiệu cho AI trích dẫn.

const repurposeInput = z
  .object({
    ...moduleJobBaseShape,
    ...localizedShape,
    primaryKeyword: z
      .string()
      .trim()
      .min(1, "Chủ đề/từ khóa chính không được để trống")
      .max(240),
    pageUrl: z.string().trim().max(2_048).default(""),
  })
  .strict();
export type RepurposeInput = z.infer<typeof repurposeInput>;

const repurposeOutput = z
  .object({
    contractVersion: z.literal("1.0"),
    thread: z.string().min(1),
    carousel: z.string().min(1),
    newsletter: z.string().min(1),
    fbPost: z.string().min(1),
  })
  .strict();
export type RepurposeOutput = z.infer<typeof repurposeOutput>;

const system = (role: string) =>
  `${seoGeoPreamble}\n${role} Chỉ trả về nội dung được yêu cầu, không giải thích thêm.`;

export const repurposeModule: ModuleDefinition<RepurposeInput, RepurposeOutput> =
  {
    key: "RIS_REPURPOSE",
    moduleNumber: 18,
    title: "Tái chế nội dung đa định dạng",
    description:
      "Biến bài viết thành thread X/Threads, carousel LinkedIn/IG, tóm tắt newsletter và caption Facebook ngắn — phủ nhiều nền tảng.",
    category: "Content",
    inputSchema: repurposeInput,
    outputSchema: repurposeOutput,
    form: [
      {
        key: "primaryKeyword",
        label: "Chủ đề / từ khóa chính",
        type: "text",
        required: true,
        placeholder: "Ví dụ: học lập trình cho người mới",
      },
      ...localizedFields,
      {
        key: "pageUrl",
        label: "URL bài viết (tùy chọn)",
        type: "text",
        placeholder: "https://... — dùng cho CTA/link trong thread & newsletter",
      },
    ],
    outputBlocks: [
      { key: "thread", label: "Thread X/Threads" },
      { key: "carousel", label: "Carousel LinkedIn/IG" },
      { key: "newsletter", label: "Tóm tắt newsletter/email" },
      { key: "fbPost", label: "Caption Facebook ngắn" },
    ],
    consumes: [
      "RIS_SITE_SCAN",
      "RIS_CONTENT_SECTIONS",
      "RIS_CONTENT_INTRO",
      "RIS_CONTENT_HEADLINE",
    ],
    async execute({ input, generate, upstream }) {
      const context = upstreamBlock(upstream, [
        { key: "RIS_SITE_SCAN", label: "Website hiện có (Module 20)" },
        { key: "RIS_CONTENT_SECTIONS", label: "Thân bài (Module 10)" },
        { key: "RIS_CONTENT_INTRO", label: "Mở đầu (Module 8)" },
        { key: "RIS_CONTENT_HEADLINE", label: "Tiêu đề (Module 7)" },
      ]);
      const base = [
        `Chủ đề: "${input.primaryKeyword}".`,
        ...localizedContextLines(input),
        input.pageUrl.trim().length > 0 ? `Link bài viết: ${input.pageUrl}` : "",
        context,
      ]
        .filter(Boolean)
        .join("\n");

      const thread = await generate({
        systemPrompt: system("Bạn là chuyên gia viết nội dung mạng xã hội."),
        prompt: [
          `Viết một THREAD bằng ${input.language} cho X (Twitter)/Threads từ nội dung dưới đây.`,
          base,
          "",
          "Yêu cầu: bài đầu là hook mạnh; 5–8 bài tiếp mỗi bài một ý cô đọng (đánh số dạng '1/', '2/'...); bài cuối là CTA (kèm link nếu có). Mỗi bài ≤ 280 ký tự. Chỉ trả về thread.",
        ].join("\n"),
        maxOutputTokens: 1_536,
      });

      const carousel = await generate({
        systemPrompt: system("Bạn là nhà thiết kế nội dung carousel."),
        prompt: [
          `Viết nội dung CAROUSEL bằng ${input.language} cho LinkedIn/Instagram từ nội dung dưới đây.`,
          base,
          "",
          "Yêu cầu: 6–8 slide. Mỗi slide đúng dạng: 'Slide N | TIÊU ĐỀ: <ngắn gọn> | NỘI DUNG: <1–2 câu> | HÌNH: <gợi ý hình/khung>'. Slide 1 là hook, slide cuối là CTA. Chỉ trả về carousel.",
        ].join("\n"),
        maxOutputTokens: 1_792,
      });

      const newsletter = await generate({
        systemPrompt: system("Bạn là biên tập viên email marketing."),
        prompt: [
          `Viết bản TÓM TẮT NEWSLETTER/EMAIL bằng ${input.language} từ nội dung dưới đây.`,
          base,
          "",
          "Yêu cầu: 'Tiêu đề email:' (giật tít, ≤60 ký tự), 'Preheader:' (≤90 ký tự), đoạn mở 2–3 câu, 3–5 gạch đầu dòng điểm chính, và CTA cuối (kèm link nếu có). Chỉ trả về bản tin.",
        ].join("\n"),
        maxOutputTokens: 1_280,
      });

      const fbPost = await generate({
        systemPrompt: system("Bạn là chuyên gia viết caption Facebook."),
        prompt: [
          `Viết CAPTION FACEBOOK ngắn bằng ${input.language} từ nội dung dưới đây.`,
          base,
          "",
          "Yêu cầu: 2–4 câu tự nhiên, có hook mở đầu, 1 CTA, và 3–5 hashtag phù hợp ở cuối. Chỉ trả về caption.",
        ].join("\n"),
        maxOutputTokens: 768,
      });

      return { contractVersion: "1.0", thread, carousel, newsletter, fbPost };
    },
  };

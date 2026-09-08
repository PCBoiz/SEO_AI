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

// Module 19 · A/B variant tiêu đề & mở bài (Tier A). Sinh nhiều phương án tiêu
// đề (#7) và đoạn mở bài (#8) cho cùng một chủ đề để chọn bản tốt nhất. (Vòng
// tự đổi theo CTR sẽ nối khi có traffic GSC — làm sau.)

const abVariantsInput = z
  .object({
    ...moduleJobBaseShape,
    ...localizedShape,
    primaryKeyword: z
      .string()
      .trim()
      .min(1, "Chủ đề/từ khóa chính không được để trống")
      .max(240),
    pageLabel: z.string().trim().max(240).default(""),
  })
  .strict();
export type AbVariantsInput = z.infer<typeof abVariantsInput>;

const abVariantsOutput = z
  .object({
    contractVersion: z.literal("1.0"),
    titleVariants: z.string().min(1),
    introVariants: z.string().min(1),
  })
  .strict();
export type AbVariantsOutput = z.infer<typeof abVariantsOutput>;

const system = (role: string) =>
  `${seoGeoPreamble()}\n${role} Chỉ trả về nội dung được yêu cầu, không giải thích thêm.`;

export const abVariantsModule: ModuleDefinition<
  AbVariantsInput,
  AbVariantsOutput
> = {
  key: "RIS_AB_VARIANTS",
  moduleNumber: 19,
  title: "A/B variant tiêu đề & mở bài",
  description:
    "Sinh nhiều phương án tiêu đề và đoạn mở bài (answer-first) cho cùng chủ đề để chọn bản có tỷ lệ nhấp/giữ chân tốt nhất.",
  category: "Content",
  inputSchema: abVariantsInput,
  outputSchema: abVariantsOutput,
  form: [
    {
      key: "primaryKeyword",
      label: "Chủ đề / từ khóa chính",
      type: "text",
      required: true,
      placeholder: "Ví dụ: học lập trình cho người mới",
    },
    {
      key: "pageLabel",
      label: "Trang / tiêu đề mục tiêu (tùy chọn)",
      type: "text",
      description: "Để trống sẽ dùng chính chủ đề chính.",
    },
    ...localizedFields,
  ],
  outputBlocks: [
    { key: "titleVariants", label: "Phương án tiêu đề (A/B)" },
    { key: "introVariants", label: "Phương án mở bài (A/B)" },
  ],
  consumes: [
    "RIS_SITE_SCAN",
    "RIS_ONPAGE_SEO",
    "RIS_CONTENT_HEADLINE",
    "RIS_CONTENT_INTRO",
    "RIS_SITEMAP_KEYWORDS",
  ],
  async execute({ input, generate, upstream }) {
    const target = input.pageLabel.trim() || input.primaryKeyword;
    const context = upstreamBlock(upstream, [
      { key: "RIS_SITE_SCAN", label: "Website hiện có (Module 20)" },
      { key: "RIS_ONPAGE_SEO", label: "On-Page SEO (Module 5)" },
      { key: "RIS_CONTENT_HEADLINE", label: "Tiêu đề hiện có (Module 7)" },
      { key: "RIS_CONTENT_INTRO", label: "Mở bài hiện có (Module 8)" },
      { key: "RIS_SITEMAP_KEYWORDS", label: "Từ khóa (Module 2)" },
    ]);
    const base = [
      `Trang/chủ đề mục tiêu: "${target}".`,
      ...localizedContextLines(input),
      context,
    ].join("\n");

    const titleVariants = await generate({
      systemPrompt: system("Bạn là chuyên gia đặt tiêu đề SEO + CTR."),
      prompt: [
        `Tạo 6 phương án TIÊU ĐỀ khác nhau bằng ${input.language} cho trang trên.`,
        base,
        "",
        "Yêu cầu: đánh số 1–6; đa dạng góc độ (lợi ích, con số, tò mò, how-to, so sánh, khẩn cấp); tự nhiên, đúng chuẩn SEO, ≤ 60 ký tự mỗi tiêu đề. Sau mỗi tiêu đề ghi ngắn '(góc: ...)'. Chỉ trả về danh sách.",
      ].join("\n"),
      maxOutputTokens: 1_024,
    });

    const introVariants = await generate({
      systemPrompt: system("Bạn là chuyên gia viết mở bài chuẩn SEO + GEO."),
      prompt: [
        `Tạo 3 phương án ĐOẠN MỞ BÀI khác nhau bằng ${input.language} cho trang trên.`,
        base,
        "",
        "Yêu cầu: đánh số 1–3; mỗi đoạn 2–4 câu, theo lối trả-lời-trước (answer-first) trả lời trực tiếp ý định tìm kiếm, nêu thực thể/số liệu để AI dễ trích dẫn. Đa dạng cách vào đề. Chỉ trả về danh sách.",
      ].join("\n"),
      maxOutputTokens: 1_280,
    });

    return { contractVersion: "1.0", titleVariants, introVariants };
  },
};

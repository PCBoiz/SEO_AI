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

// Module 17 · Tạo video từ bài viết (pha 1, thuần AI trên engine chung). Biến
// nội dung đã viết thành gói sản xuất video: kịch bản phân cảnh (kèm shot-list),
// lời thoại voiceover, phụ đề .srt, và VideoObject JSON-LD để AI/search trích
// dẫn (YouTube là search engine + được AI Overviews nhắc tới → đòn bẩy GEO).
// Pha 2 (render MP4 qua API bên thứ 3 + TTS) làm sau.

const videoScriptInput = z
  .object({
    ...moduleJobBaseShape,
    ...localizedShape,
    primaryKeyword: z
      .string()
      .trim()
      .min(1, "Chủ đề/từ khóa video không được để trống")
      .max(240),
    platform: z.enum(["short", "long"]).default("short"),
    pageUrl: z.string().trim().max(2_048).default(""),
  })
  .strict();
export type VideoScriptInput = z.infer<typeof videoScriptInput>;

const videoScriptOutput = z
  .object({
    contractVersion: z.literal("1.0"),
    script: z.string().min(1),
    voiceover: z.string().min(1),
    srt: z.string().min(1),
    videoObject: z.string().min(1),
  })
  .strict();
export type VideoScriptOutput = z.infer<typeof videoScriptOutput>;

const system = (role: string) =>
  `${seoGeoPreamble()}\n${role} Chỉ trả về nội dung được yêu cầu, không giải thích thêm.`;

interface PlatformSpec {
  label: string;
  scenes: string;
  totalSeconds: number;
  pacing: string;
}

function platformSpec(platform: "short" | "long"): PlatformSpec {
  if (platform === "long") {
    return {
      label: "YouTube (video dài)",
      scenes: "8–10 cảnh",
      totalSeconds: 240,
      pacing:
        "Tổng ~3–5 phút. Hook trong 5 giây đầu, thân bài chia mục rõ, chốt bằng CTA.",
    };
  }
  return {
    label: "Shorts/Reels/TikTok (video ngắn)",
    scenes: "4–6 cảnh",
    totalSeconds: 50,
    pacing:
      "Tổng ~30–60 giây. Hook cực mạnh trong 3 giây đầu, câu ngắn, nhịp nhanh, CTA cuối.",
  };
}

export const videoScriptModule: ModuleDefinition<
  VideoScriptInput,
  VideoScriptOutput
> = {
  key: "RIS_VIDEO_SCRIPT",
  moduleNumber: 17,
  title: "Tạo video từ bài viết",
  description:
    "Biến nội dung đã viết thành gói video: kịch bản phân cảnh (kèm shot-list), lời thoại voiceover, phụ đề .srt và VideoObject JSON-LD.",
  category: "Video",
  inputSchema: videoScriptInput,
  outputSchema: videoScriptOutput,
  form: [
    {
      key: "primaryKeyword",
      label: "Chủ đề / từ khóa video",
      type: "text",
      required: true,
      placeholder: "Ví dụ: học lập trình cho người mới",
    },
    {
      key: "platform",
      label: "Định dạng video",
      type: "select",
      required: true,
      options: [
        { value: "short", label: "Video ngắn (Shorts/Reels/TikTok, ~30–60 giây)" },
        { value: "long", label: "Video dài (YouTube, ~3–5 phút)" },
      ],
    },
    ...localizedFields,
    {
      key: "pageUrl",
      label: "URL trang/bài (tùy chọn)",
      type: "text",
      placeholder: "https://... — nhúng vào VideoObject nếu có",
    },
  ],
  outputBlocks: [
    { key: "script", label: "Kịch bản phân cảnh (storyboard + lời)" },
    { key: "voiceover", label: "Lời thoại (voiceover)" },
    { key: "srt", label: "Phụ đề .srt" },
    { key: "videoObject", label: "VideoObject JSON-LD" },
  ],
  consumes: [
    "RIS_SITE_SCAN",
    "RIS_CONTENT_SECTIONS",
    "RIS_CONTENT_INTRO",
    "RIS_CONTENT_HEADLINE",
  ],
  async execute({ input, generate, upstream }) {
    const spec = platformSpec(input.platform);
    const context = upstreamBlock(upstream, [
      { key: "RIS_SITE_SCAN", label: "Website hiện có (Module 20)" },
      { key: "RIS_CONTENT_SECTIONS", label: "Thân bài (Module 10)" },
      { key: "RIS_CONTENT_INTRO", label: "Mở đầu (Module 8)" },
      { key: "RIS_CONTENT_HEADLINE", label: "Tiêu đề (Module 7)" },
    ]);

    const script = await generate({
      systemPrompt: system("Bạn là biên kịch video ngắn chuyên nghiệp."),
      prompt: [
        `Viết KỊCH BẢN PHÂN CẢNH bằng ${input.language} cho video về "${input.primaryKeyword}".`,
        `Định dạng: ${spec.label}. ${spec.pacing} Số cảnh: ${spec.scenes}.`,
        ...localizedContextLines(input),
        context,
        "",
        "Mỗi cảnh trình bày đúng dạng (mỗi cảnh cách nhau một dòng trống):",
        "Cảnh N (mm:ss–mm:ss)",
        "HÌNH: <mô tả khung hình/shot: bối cảnh, chủ thể, chuyển động, text on-screen>",
        "LỜI: <lời thoại người dẫn, tự nhiên, đúng nhịp>",
        "",
        "Bám sát nội dung bài viết ở trên (nếu có). Bắt đầu bằng hook, kết bằng CTA. Chỉ trả về kịch bản.",
      ].join("\n"),
      maxOutputTokens: 2_560,
    });

    const voiceover = await generate({
      systemPrompt: system("Bạn là biên tập lời thoại cho thu âm/TTS."),
      prompt: [
        "Từ kịch bản dưới đây, trích riêng phần LỜI thành một đoạn lời thoại liền mạch để thu âm hoặc đọc bằng TTS.",
        "Bỏ hết nhãn cảnh, timecode và phần HÌNH. Giữ đúng thứ tự, câu tự nhiên, dễ đọc thành tiếng.",
        "",
        "Kịch bản:",
        script,
        "",
        "Chỉ trả về đoạn lời thoại.",
      ].join("\n"),
      maxOutputTokens: 1_536,
    });

    const srt = await generate({
      systemPrompt: system("Bạn là chuyên gia làm phụ đề."),
      prompt: [
        `Chuyển lời thoại dưới đây thành phụ đề định dạng SRT chuẩn, tổng thời lượng khoảng ${spec.totalSeconds} giây, chia đều hợp lý.`,
        "Mỗi khối gồm: số thứ tự, dòng timecode 'HH:MM:SS,mmm --> HH:MM:SS,mmm', rồi 1–2 dòng chữ ngắn (tối đa ~42 ký tự/dòng). Cách nhau một dòng trống.",
        "",
        "Lời thoại:",
        voiceover,
        "",
        "Chỉ trả về nội dung file .srt.",
      ].join("\n"),
      maxOutputTokens: 2_048,
    });

    const videoObject = await generate({
      systemPrompt: system(
        "Bạn là kỹ sư SEO kỹ thuật, thành thạo schema.org JSON-LD.",
      ),
      prompt: [
        "Tạo mã VideoObject JSON-LD hợp lệ (schema.org) cho video trên.",
        `Chủ đề: ${input.primaryKeyword}. Ngôn ngữ (inLanguage): ${input.language}.`,
        `Thời lượng xấp xỉ ${spec.totalSeconds} giây → 'duration' dạng ISO 8601 (ví dụ PT50S).`,
        input.pageUrl.trim().length > 0
          ? `Trang liên quan (dùng cho 'contentUrl'/'embedUrl' nếu hợp lý): ${input.pageUrl}`
          : "Không có URL cụ thể; dùng placeholder \"https://example.com\".",
        "Gồm: name, description (≤2 câu), thumbnailUrl (placeholder), uploadDate (ngày hôm nay, YYYY-MM-DD), duration, inLanguage.",
        "",
        "Chỉ trả về khối mã (bọc trong <script type=\"application/ld+json\"> ... </script>), không giải thích.",
      ].join("\n"),
      maxOutputTokens: 1_280,
    });

    return { contractVersion: "1.0", script, voiceover, srt, videoObject };
  },
};

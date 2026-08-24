import { z } from "zod";
import type { ModuleDefinition } from "@/domain/modules/module-definition";
import { moduleJobBaseShape } from "@/domain/modules/module-job";
import { seoGeoPreamble } from "@/domain/modules/seo-geo";

// Module 14/15/16 · Đăng mạng xã hội (Facebook Page, Zalo OA, Google Business
// Profile). AI viết caption từ nội dung đã có (nối luồng), rồi gọi API nền tảng
// bằng token dán theo dự án (mã hoá vault). Build sẵn — owner test khi có token.

const socialInputSchema = z
  .object({
    ...moduleJobBaseShape,
    message: z.string().trim().max(4_000).default(""),
    linkUrl: z.string().trim().max(2_048).default(""),
  })
  .strict();
type SocialInput = z.infer<typeof socialInputSchema>;

const socialOutputSchema = z
  .object({
    contractVersion: z.literal("1.0"),
    result: z.string().min(1),
  })
  .strict();
type SocialOutput = z.infer<typeof socialOutputSchema>;

const socialForm = [
  {
    key: "message" as const,
    label: "Nội dung đăng (tùy chọn)",
    type: "textarea" as const,
    rows: 4,
    description: "Bỏ trống thì AI tự viết caption từ bài đã tạo (Module 7/8).",
  },
  {
    key: "linkUrl" as const,
    label: "Link bài viết (tùy chọn)",
    type: "text" as const,
    placeholder: "Bỏ trống sẽ tự lấy link bài WordPress vừa đăng (Module 12)",
  },
];

const captionSystem = `${seoGeoPreamble}\nBạn là chuyên gia social media. Viết caption tự nhiên, hấp dẫn, có 2–4 hashtag phù hợp. Chỉ trả về caption.`;

async function buildMessage(
  input: SocialInput,
  upstream: Record<string, string>,
  generate: (request: {
    systemPrompt?: string;
    prompt: string;
    maxOutputTokens?: number;
  }) => Promise<string>,
  platform: string,
): Promise<string> {
  if (input.message.trim()) return input.message.trim();
  const context = [
    upstream.RIS_CONTENT_HEADLINE
      ? `Các tiêu đề bài viết:\n${upstream.RIS_CONTENT_HEADLINE}`
      : "",
    upstream.RIS_CONTENT_INTRO
      ? `Mở đầu bài viết:\n${upstream.RIS_CONTENT_INTRO}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  if (!context) {
    throw new Error(
      "Chưa có nội dung để viết caption — nhập tay ô 'Nội dung đăng' hoặc chạy Module 7/8 trước.",
    );
  }
  return generate({
    systemPrompt: captionSystem,
    prompt: `Viết 1 caption ${platform} (80–200 từ) giới thiệu bài viết dưới đây, kèm lời mời bấm xem chi tiết.\n\n${context}`,
    maxOutputTokens: 1_024,
  });
}

// Tự lấy link bài WordPress đã đăng (Module 12) từ upstream nếu không nhập tay.
function resolveLink(
  input: SocialInput,
  upstream: Record<string, string>,
): string {
  if (input.linkUrl.trim()) return input.linkUrl.trim();
  const match = upstream.RIS_WP_PUBLISH?.match(/Link:\s*(\S+)/);
  return match?.[1] ?? "";
}

async function readJsonSafe(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  return text.slice(0, 300);
}

/* ───────────────────── Module 14 · Facebook Page ───────────────────── */

export const facebookPublishModule: ModuleDefinition<SocialInput, SocialOutput> =
  {
    key: "RIS_FB_PUBLISH",
    moduleNumber: 14,
    title: "Đăng Facebook Page",
    description:
      "AI viết caption từ bài đã tạo rồi đăng lên Fanpage qua Graph API (cần Page ID + Page Access Token).",
    category: "Publishing",
    inputSchema: socialInputSchema,
    outputSchema: socialOutputSchema,
    needsIntegrations: ["facebook"],
    form: socialForm,
    outputBlocks: [{ key: "result", label: "Kết quả đăng Facebook" }],
    consumes: ["RIS_SITE_SCAN", "RIS_CONTENT_HEADLINE", "RIS_CONTENT_INTRO", "RIS_WP_PUBLISH"],
    async execute({ input, upstream, integrations, generate }) {
      const facebook = integrations.facebook;
      if (!facebook) throw new Error("Chưa cấu hình Facebook cho dự án.");
      const pageId = facebook.config.pageId?.trim();
      if (!pageId) {
        throw new Error("Thiếu Page ID — điền lại ở phần Kết nối nền tảng.");
      }
      const message = await buildMessage(input, upstream, generate, "Facebook");
      const link = resolveLink(input, upstream);
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            ...(link ? { link } : {}),
            access_token: facebook.secret,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(
          `Facebook từ chối (HTTP ${response.status}): ${await readJsonSafe(response)}`,
        );
      }
      const data = (await response.json()) as { id?: string };
      return {
        contractVersion: "1.0",
        result: [
          "Đã đăng lên Facebook Page.",
          `Post ID: ${data.id ?? "?"}`,
          link ? `Link đính kèm: ${link}` : "",
          "",
          "Caption đã đăng:",
          message,
        ]
          .filter(Boolean)
          .join("\n"),
      };
    },
  };

/* ───────────────────── Module 15 · Zalo OA ───────────────────── */

export const zaloPublishModule: ModuleDefinition<SocialInput, SocialOutput> = {
  key: "RIS_ZALO_PUBLISH",
  moduleNumber: 15,
  title: "Đăng Zalo OA",
  description:
    "AI viết caption rồi tạo bài viết trên Zalo Official Account (cần OA Access Token).",
  category: "Publishing",
  inputSchema: socialInputSchema,
  outputSchema: socialOutputSchema,
  needsIntegrations: ["zalo"],
  form: socialForm,
  outputBlocks: [{ key: "result", label: "Kết quả đăng Zalo OA" }],
  consumes: ["RIS_SITE_SCAN", "RIS_CONTENT_HEADLINE", "RIS_CONTENT_INTRO", "RIS_WP_PUBLISH"],
  async execute({ input, upstream, integrations, generate }) {
    const zalo = integrations.zalo;
    if (!zalo) throw new Error("Chưa cấu hình Zalo OA cho dự án.");
    const message = await buildMessage(input, upstream, generate, "Zalo");
    const link = resolveLink(input, upstream);
    // Gửi broadcast dạng text tới người quan tâm OA (API v3.0).
    const response = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: zalo.secret,
      },
      body: JSON.stringify({
        recipient: { target: {}, },
        message: { text: link ? `${message}\n\n${link}` : message },
      }),
    });
    const body = await readJsonSafe(response);
    if (!response.ok) {
      throw new Error(`Zalo từ chối (HTTP ${response.status}): ${body}`);
    }
    // Zalo trả HTTP 200 kể cả khi lỗi logic — kiểm tra error code trong body.
    if (/"error"\s*:\s*(?!0)/.test(body)) {
      throw new Error(`Zalo báo lỗi: ${body}`);
    }
    return {
      contractVersion: "1.0",
      result: ["Đã gửi nội dung qua Zalo OA.", "", "Caption:", message]
        .filter(Boolean)
        .join("\n"),
    };
  },
};

/* ─────────────── Module 16 · Google Business Profile ─────────────── */

export const gbpPublishModule: ModuleDefinition<SocialInput, SocialOutput> = {
  key: "RIS_GBP_PUBLISH",
  moduleNumber: 16,
  title: "Đăng Google Business Profile",
  description:
    "AI viết bản tin ngắn rồi đăng Local Post lên hồ sơ Google Business (cần Account ID, Location ID và OAuth Access Token).",
  category: "Publishing",
  inputSchema: socialInputSchema,
  outputSchema: socialOutputSchema,
  needsIntegrations: ["google_business"],
  form: socialForm,
  outputBlocks: [{ key: "result", label: "Kết quả đăng Google Business" }],
  consumes: ["RIS_SITE_SCAN", "RIS_CONTENT_HEADLINE", "RIS_CONTENT_INTRO", "RIS_WP_PUBLISH"],
  async execute({ input, upstream, integrations, generate }) {
    const gbp = integrations.google_business;
    if (!gbp) throw new Error("Chưa cấu hình Google Business cho dự án.");
    const accountId = gbp.config.accountId?.trim();
    const locationId = gbp.config.locationId?.trim();
    if (!accountId || !locationId) {
      throw new Error(
        "Thiếu Account ID / Location ID — điền lại ở phần Kết nối nền tảng.",
      );
    }
    const message = await buildMessage(
      input,
      upstream,
      generate,
      "Google Business (tin ngắn ≤1500 ký tự)",
    );
    const link = resolveLink(input, upstream);
    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/localPosts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gbp.secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          languageCode: "vi",
          topicType: "STANDARD",
          summary: message.slice(0, 1_500),
          ...(link
            ? { callToAction: { actionType: "LEARN_MORE", url: link } }
            : {}),
        }),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Google Business từ chối (HTTP ${response.status}): ${await readJsonSafe(response)}`,
      );
    }
    const data = (await response.json()) as { name?: string };
    return {
      contractVersion: "1.0",
      result: [
        "Đã đăng Local Post lên Google Business Profile.",
        data.name ? `Post: ${data.name}` : "",
        "",
        "Nội dung:",
        message,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  },
};

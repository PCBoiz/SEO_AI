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

// Module 13 · GEO Files: sinh llms.txt (chuẩn llmstxt.org — giúp AI crawler hiểu
// site để trích dẫn) bằng AI, và sitemap.xml dựng máy móc từ nhãn sitemap.
// Người dùng tải về/dán lên website (gốc domain).

const inputSchema = z
  .object({
    ...moduleJobBaseShape,
    ...localizedShape,
    siteName: z
      .string()
      .trim()
      .min(1, "Tên website/thương hiệu không được để trống")
      .max(160),
    websiteUrl: z
      .string()
      .trim()
      .url("Phải là URL đầy đủ (https://...)")
      .max(2_048),
    sitemapLabels: z
      .array(z.string().trim().min(1).max(200))
      .max(60, "Tối đa 60 nhãn")
      .default([]),
  })
  .strict();
export type GeoFilesInput = z.infer<typeof inputSchema>;

const outputSchema = z
  .object({
    contractVersion: z.literal("1.0"),
    llmsTxt: z.string().min(1),
    sitemapXml: z.string().min(1),
    robotsTxt: z.string().min(1),
    deployGuide: z.string().min(1),
  })
  .strict();
export type GeoFilesOutput = z.infer<typeof outputSchema>;

export const geoFilesModule: ModuleDefinition<GeoFilesInput, GeoFilesOutput> = {
  key: "RIS_GEO_FILES",
  moduleNumber: 13,
  title: "GEO trọn gói (llms.txt + sitemap + robots + hướng dẫn)",
  description:
    "Sinh llms.txt, sitemap.xml, robots.txt cho phép AI crawler, KÈM hướng dẫn triển khai từng bước dễ hiểu + checklist để AI bắt đầu giới thiệu về bạn.",
  category: "SEO",
  inputSchema,
  outputSchema,
  form: [
    {
      key: "siteName",
      label: "Tên website / thương hiệu",
      type: "text",
      required: true,
      prefillFromProject: "name",
    },
    {
      key: "websiteUrl",
      label: "URL website",
      type: "text",
      required: true,
      prefillFromProject: "website",
      placeholder: "https://example.com",
    },
    ...localizedFields,
    {
      key: "sitemapLabels",
      label: "Nhãn sitemap (tùy chọn)",
      type: "textarea",
      rows: 5,
      asLines: true,
      description:
        "Mỗi dòng một nhãn trang (dán từ Module 1). Bỏ trống thì sitemap.xml chỉ gồm trang chủ.",
    },
  ],
  outputBlocks: [
    { key: "deployGuide", label: "Hướng dẫn triển khai (làm theo từng bước)" },
    { key: "llmsTxt", label: "llms.txt (đặt ở gốc website)" },
    { key: "sitemapXml", label: "sitemap.xml (đặt ở gốc website)" },
    { key: "robotsTxt", label: "robots.txt (cho phép AI crawler)" },
  ],
  consumes: ["RIS_SITE_SCAN", "RIS_SITEMAP_KEYWORDS", "RIS_ICN_KEYWORDS"],
  async execute({ input, generate, upstream }) {
    const context = upstreamBlock(upstream, [
      { key: "RIS_SITE_SCAN", label: "Website hiện có (Module 20)" },
      { key: "RIS_SITEMAP_KEYWORDS", label: "Từ khóa (Module 2)" },
      { key: "RIS_ICN_KEYWORDS", label: "Mạng nội dung ICN (Module 3)" },
    ]);
    const labels =
      input.sitemapLabels.length > 0
        ? input.sitemapLabels
        : ["Trang chủ"];

    const llmsTxt = await generate({
      systemPrompt: `${seoGeoPreamble()}\nBạn là chuyên gia GEO kỹ thuật, thành thạo chuẩn llms.txt (llmstxt.org). Chỉ trả về nội dung file, không giải thích.`,
      prompt: [
        `Hãy tạo file llms.txt bằng ${input.language} cho website "${input.siteName}" (${input.websiteUrl}).`,
        ...localizedContextLines(input),
        "",
        "Các trang chính của site:",
        labels.map((label) => `- ${label}`).join("\n"),
        context,
        "",
        "Định dạng chuẩn llms.txt: dòng 1 là `# ${tên site}`; tiếp theo `> ${mô tả một câu, giàu thực thể}`; sau đó 1–2 đoạn ngắn về doanh nghiệp; rồi các mục `## ${nhóm}` chứa danh sách `- [Tên trang](URL): mô tả ngắn` (URL suy ra từ domain + slug hợp lý, không dấu). Chỉ trả về nội dung file.",
      ].join("\n"),
      maxOutputTokens: 2_048,
    });

    // Hướng dẫn triển khai cá nhân hóa: viết cho người KHÔNG rành kỹ thuật,
    // đúng ngữ cảnh site (WordPress phổ biến ở VN) + checklist để AI biết tới site.
    const deployGuide = await generate({
      systemPrompt: `${seoGeoPreamble()}\nBạn là chuyên gia hướng dẫn kỹ thuật cho người KHÔNG rành công nghệ. Viết ngắn gọn, từng bước đánh số, chỉ đúng chỗ cần bấm. Chỉ trả về nội dung hướng dẫn.`,
      prompt: [
        `Viết hướng dẫn triển khai GEO bằng ${input.language} cho chủ website "${input.siteName}" (${input.websiteUrl}) — người đọc không rành kỹ thuật.`,
        "",
        "Bối cảnh: người dùng vừa nhận 3 file: llms.txt, sitemap.xml, robots.txt (nội dung đã có sẵn, chỉ cần đặt lên website).",
        "",
        "Hướng dẫn phải gồm 4 phần, mỗi phần các bước đánh số cụ thể:",
        "1. ĐƯA FILE LÊN WEBSITE — hai cách: (a) nếu dùng WordPress: cài plugin miễn phí 'WP Robots Txt' (cho robots.txt) và plugin file manager hoặc nhờ hosting; (b) nếu có cPanel/hosting: mở File Manager → thư mục public_html → tải 3 file lên. Nhấn mạnh: file phải truy cập được tại tenmien.com/llms.txt, /sitemap.xml, /robots.txt.",
        "2. KHAI BÁO VỚI GOOGLE — vào search.google.com/search-console, thêm website (xác minh theo hướng dẫn của Google), vào mục Sitemaps, dán 'sitemap.xml' và bấm Gửi.",
        "3. KIỂM TRA AI ĐÃ 'THẤY' — mở tenmien.com/llms.txt trên trình duyệt xem có hiện nội dung không; sau 1–2 tuần hỏi thử ChatGPT/Perplexity về lĩnh vực + địa phương của mình xem thương hiệu có được nhắc tới.",
        "4. DUY TRÌ — mỗi khi đăng bài mới bằng Antigravity, nội dung chuẩn GEO tự tích lũy; nên chạy lại module này mỗi khi cấu trúc site thay đổi.",
        "Giọng thân thiện, không thuật ngữ khó, mỗi bước một dòng.",
      ].join("\n"),
      maxOutputTokens: 2_048,
    });

    return {
      contractVersion: "1.0",
      llmsTxt,
      sitemapXml: buildSitemapXml(input.websiteUrl, labels),
      robotsTxt: buildRobotsTxt(input.websiteUrl),
      deployGuide,
    };
  },
};

// robots.txt cho phép các AI crawler chính (GEO) + trỏ sitemap. Dựng máy móc.
export function buildRobotsTxt(websiteUrl: string): string {
  const base = websiteUrl.replace(/\/+$/, "");
  const aiBots = [
    "GPTBot", // OpenAI / ChatGPT
    "OAI-SearchBot", // ChatGPT search
    "PerplexityBot",
    "ClaudeBot", // Anthropic
    "Claude-SearchBot",
    "Google-Extended", // Gemini / AI Overviews training
    "Bingbot",
    "CCBot", // Common Crawl (nguồn train nhiều model)
  ];
  return [
    "# Cho phép AI crawler đọc site để trích dẫn (GEO) — sinh bởi Antigravity OS",
    ...aiBots.flatMap((bot) => [`User-agent: ${bot}`, "Allow: /", ""]),
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${base}/sitemap.xml`,
  ].join("\n");
}

// sitemap.xml dựng máy móc: trang chủ + mỗi nhãn một URL slug không dấu.
export function buildSitemapXml(websiteUrl: string, labels: string[]): string {
  const base = websiteUrl.replace(/\/+$/, "");
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    `${base}/`,
    ...labels
      .filter((label) => !/^trang\s*chủ$/i.test(label.trim()))
      .map((label) => `${base}/${slugify(label)}/`),
  ];
  const entries = urls
    .map(
      (url) =>
        `  <url>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

// Bỏ dấu tiếng Việt + ký tự đặc biệt để tạo slug URL.
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

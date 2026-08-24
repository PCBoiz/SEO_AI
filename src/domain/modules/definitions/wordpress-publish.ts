import { z } from "zod";
import type { ModuleDefinition } from "@/domain/modules/module-definition";
import { moduleJobBaseShape } from "@/domain/modules/module-job";

// Module 12 · Đăng WordPress (RIS 3.5 #12, phần WordPress; Facebook làm sau).
// KHÔNG gọi model AI — ghép bài từ đầu ra các module trước (tiêu đề, mở đầu,
// thân bài, FAQ + JSON-LD) và đăng lên WordPress của dự án qua REST API với
// Application Password đã mã hoá trong vault. Mặc định tạo BẢN NHÁP (draft-first
// theo quyết định owner) — duyệt trong WP rồi mới publish.

const inputSchema = z
  .object({
    ...moduleJobBaseShape,
    title: z.string().trim().max(200).default(""),
    publishMode: z.enum(["draft", "publish"]).default("draft"),
  })
  .strict();
export type WordpressPublishInput = z.infer<typeof inputSchema>;

const outputSchema = z
  .object({
    contractVersion: z.literal("1.0"),
    result: z.string().min(1),
    postUrl: z.string().min(1),
  })
  .strict();
export type WordpressPublishOutput = z.infer<typeof outputSchema>;

export const wordpressPublishModule: ModuleDefinition<
  WordpressPublishInput,
  WordpressPublishOutput
> = {
  key: "RIS_WP_PUBLISH",
  moduleNumber: 12,
  title: "Đăng WordPress",
  description:
    "Ghép bài từ các module trước (tiêu đề, mở đầu, thân bài, FAQ + JSON-LD) và đăng lên WordPress của dự án — mặc định bản nháp để bạn duyệt.",
  category: "Publishing",
  inputSchema,
  outputSchema,
  requiresAi: false,
  needsIntegrations: ["wordpress"],
  form: [
    {
      key: "title",
      label: "Tiêu đề bài (tùy chọn)",
      type: "text",
      placeholder: "Để trống sẽ lấy tiêu đề đầu tiên từ Module 7",
    },
    {
      key: "publishMode",
      label: "Chế độ đăng",
      type: "select",
      required: true,
      options: [
        { label: "Bản nháp (duyệt rồi mới publish) — khuyến nghị", value: "draft" },
        { label: "Publish thẳng", value: "publish" },
      ],
      description:
        "Bản nháp an toàn hơn: bài nằm trong WP Drafts, bạn kiểm tra rồi bấm publish.",
    },
  ],
  outputBlocks: [{ key: "result", label: "Kết quả đăng bài" }],
  consumes: [
    "RIS_SITE_SCAN",
    "RIS_CONTENT_HEADLINE",
    "RIS_CONTENT_INTRO",
    "RIS_CONTENT_SECTIONS",
    "RIS_GEO_SCHEMA",
  ],
  async execute({ input, upstream, integrations }) {
    const wordpress = integrations.wordpress;
    if (!wordpress) {
      throw new Error("Dự án chưa cấu hình WordPress.");
    }

    const title =
      input.title.trim() ||
      firstHeadline(upstream.RIS_CONTENT_HEADLINE) ||
      "Bài viết từ Antigravity OS";

    const parts: string[] = [];
    if (upstream.RIS_CONTENT_INTRO) {
      parts.push(markdownToHtml(stripBlockLabels(upstream.RIS_CONTENT_INTRO)));
    }
    if (upstream.RIS_CONTENT_SECTIONS) {
      parts.push(
        markdownToHtml(stripBlockLabels(upstream.RIS_CONTENT_SECTIONS)),
      );
    }
    if (upstream.RIS_GEO_SCHEMA) {
      const faq = extractSection(upstream.RIS_GEO_SCHEMA, "FAQ khớp câu hỏi");
      if (faq) {
        parts.push(`<h2>Câu hỏi thường gặp</h2>\n${markdownToHtml(faq)}`);
      }
      const jsonLd = extractSection(
        upstream.RIS_GEO_SCHEMA,
        "Mã JSON-LD",
      )?.trim();
      if (jsonLd?.startsWith("<script")) parts.push(jsonLd);
    }
    if (parts.length === 0) {
      throw new Error(
        "Chưa có nội dung để đăng — hãy chạy các module nội dung (7, 8, 10, 11) trước, hoặc chạy cả luồng ở trang Quy trình.",
      );
    }

    const baseUrl = wordpress.url.replace(/\/+$/, "");
    const target = await resolveWordpressTarget(baseUrl, wordpress);
    const response = await fetch(target.endpoint, {
      method: "POST",
      headers: {
        Authorization: target.authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        content: parts.join("\n\n"),
        status: input.publishMode,
      }),
      // KHÔNG tự đi theo redirect: chuẩn fetch đổi POST→GET ở 301/302 và xoá
      // header Authorization khi sang host khác → job sẽ báo thành công nhưng
      // thực tế không tạo bài nào. Site WordPress.com gói Business (Atomic) và
      // site nhập sai http/tên miền đều rơi vào trường hợp này.
      redirect: "manual",
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location") ?? "";
      const redirectHost = safeHost(location);
      throw new Error(
        [
          `WordPress chuyển hướng sang địa chỉ khác (HTTP ${response.status}${redirectHost ? ` → ${redirectHost}` : ""}).`,
          "Bài viết CHƯA được tạo. Hãy sửa \"WordPress URL\" trong Dự án → Sửa thành đúng địa chỉ chính thức của site:",
          "- Nếu đang nhập http:// thì đổi thành https://.",
          "- Nếu site dùng tên miền riêng thì nhập tên miền đó, không dùng địa chỉ *.wordpress.com.",
        ].join("\n"),
      );
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const hint =
        response.status === 401 || response.status === 403
          ? target.kind === "wpcom"
            ? "\nSite WordPress.com xác thực bằng OAuth2 token — hãy kiểm tra token trong Dự án → Sửa (token hết hạn hoặc không có quyền đăng bài)."
            : "\nKiểm tra lại tên đăng nhập và Mật khẩu ứng dụng; một số plugin bảo mật cũng chặn REST API."
          : "";
      throw new Error(
        `WordPress từ chối (HTTP ${response.status}): ${body.slice(0, 200)}${hint}`,
      );
    }
    const post = (await response.json()) as {
      id?: number;
      link?: string;
      status?: string;
    };
    const postUrl = post.link ?? `${baseUrl}/?p=${post.id ?? ""}`;
    const statusLabel = post.status === "publish" ? "ĐÃ PUBLISH" : "BẢN NHÁP";
    return {
      contractVersion: "1.0",
      result: [
        `Đăng thành công (${statusLabel}).`,
        `Tiêu đề: ${title}`,
        `Post ID: ${post.id ?? "?"}`,
        `Link: ${postUrl}`,
        target.kind === "wpcom"
          ? "Kênh: WordPress.com (public-api, OAuth2)."
          : "Kênh: REST API trên tên miền (Application Password).",
        post.status !== "publish"
          ? "Vào WordPress → Posts → Drafts để duyệt và bấm Publish."
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      postUrl,
    };
  },
};

interface WordpressTarget {
  kind: "self_hosted" | "wpcom";
  endpoint: string;
  authorization: string;
}

// Tự nhận diện loại site thay vì bắt người dùng khai báo:
//  - WordPress tự host và WordPress.com gói Business (Atomic) mở REST API ngay
//    trên tên miền → dùng Basic auth với Application Password.
//  - WordPress.com gói Free/Personal/Premium ("Simple site") KHÔNG mở /wp-json/
//    trên tên miền; REST API đi qua public-api.wordpress.com và xác thực bằng
//    OAuth2 token. Nhận diện bằng cách thử /wp-json/ nên vẫn đúng cả khi site
//    WordPress.com đã gắn tên miền riêng (lúc đó không thể đoán theo tên miền).
async function resolveWordpressTarget(
  baseUrl: string,
  credentials: { username: string; password: string },
): Promise<WordpressTarget> {
  const basic = `Basic ${Buffer.from(
    `${credentials.username}:${credentials.password}`,
    "utf8",
  ).toString("base64")}`;

  let probeStatus: number;
  let canonicalBase: string;
  try {
    // Đi THEO chuyển hướng để tìm địa chỉ chính thức của site: tên miền riêng
    // gắn vào WordPress.com trỏ về *.wordpress.com, http→https, www↔non-www.
    // Probe là GET không kèm thông tin đăng nhập nên đi theo là an toàn — nhờ
    // vậy người dùng nhập tên miền nào cũng chạy, không phải tự sửa URL.
    const probe = await fetch(`${baseUrl}/wp-json/`, {
      method: "GET",
      redirect: "follow",
    });
    probeStatus = probe.status;
    canonicalBase = originOf(probe.url) ?? baseUrl;
  } catch (error) {
    // Lỗi mạng/DNS: không suy đoán, báo thẳng để owner sửa URL.
    throw new Error(
      [
        `Không kết nối được tới ${safeHost(baseUrl) || baseUrl}: ${
          error instanceof Error ? error.message : "lỗi mạng"
        }.`,
        'Kiểm tra lại "WordPress URL" trong Dự án → Sửa.',
        "Nếu bạn vừa gắn tên miền mới, DNS/SSL có thể chưa cấp xong — tạm dùng địa chỉ *.wordpress.com của site cho tới khi tên miền hoạt động.",
      ].join("\n"),
    );
  }

  // Chỉ gửi thông tin đăng nhập qua kênh mã hóa.
  if (
    !canonicalBase.startsWith("https://") &&
    !canonicalBase.startsWith("http://localhost")
  ) {
    throw new Error(
      `Site ${safeHost(canonicalBase) || canonicalBase} không chạy HTTPS nên không thể gửi thông tin đăng nhập an toàn. Hãy bật SSL cho site rồi thử lại.`,
    );
  }

  if (probeStatus !== 404) {
    return {
      kind: "self_hosted",
      endpoint: `${canonicalBase}/wp-json/wp/v2/posts`,
      authorization: basic,
    };
  }

  const host = safeHost(canonicalBase);
  if (!host) {
    throw new Error(
      `"WordPress URL" không hợp lệ: ${baseUrl}. Nhập dạng https://tenmien.com.`,
    );
  }
  return {
    kind: "wpcom",
    endpoint: `https://public-api.wordpress.com/wp/v2/sites/${host}/posts`,
    // Site WordPress.com dùng OAuth2 — ô "Mật khẩu ứng dụng" lúc này chứa token.
    authorization: `Bearer ${credentials.password}`,
  };
}

// Gốc (scheme + host) của URL cuối cùng sau khi đi hết chuyển hướng. Trả null
// khi không parse được — ví dụ Response giả lập trong test có url rỗng.
function originOf(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

// Chỉ lấy host của URL redirect để đưa vào thông báo lỗi — tránh ghi nguyên URL
// (có thể kèm query chứa token) vào job hiển thị cho người dùng.
function safeHost(location: string): string {
  try {
    return new URL(location).host;
  } catch {
    return "";
  }
}

// Lấy tiêu đề đầu tiên khả dĩ từ đầu ra Module 7 (bỏ đánh số/quote/nhãn khối).
function firstHeadline(headlines: string | undefined): string | null {
  if (!headlines) return null;
  for (const raw of stripBlockLabels(headlines).split("\n")) {
    const line = raw
      .replace(/^[\s>*-]*\d+[.)]\s*/, "")
      .replace(/^[#>*\s-]+/, "")
      .replace(/^["“]|["”]\s*$/g, "")
      .trim();
    if (line.length >= 15 && line.length <= 120) return line;
  }
  return null;
}

// Bỏ dòng nhãn "## ..." do flattenModuleOutput chèn (nhãn khối, không phải nội dung).
function stripBlockLabels(value: string): string {
  return value
    .split("\n")
    .filter((line, index) => !(index === 0 && line.startsWith("## ")))
    .join("\n");
}

// Cắt phần nội dung theo nhãn khối trong text upstream đã flatten.
function extractSection(value: string, labelPrefix: string): string | null {
  const lines = value.split("\n");
  const start = lines.findIndex(
    (line) => line.startsWith("## ") && line.includes(labelPrefix),
  );
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
}

// Chuyển markdown tối giản sang HTML cho WordPress (heading, list, đoạn văn,
// bold/italic). Duyệt theo dòng để heading nằm chung khối với nội dung vẫn đúng.
function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      html.push(`<p>${paragraph.map(inline).join("<br />")}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      const tag = list.ordered ? "ol" : "ul";
      html.push(
        `<${tag}>${list.items.map((item) => `<li>${inline(item)}</li>`).join("")}</${tag}>`,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const tag = heading[1].length >= 3 ? "h3" : "h2";
      html.push(`<${tag}>${inline(heading[2])}</${tag}>`);
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return html.join("\n");
}

function inline(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

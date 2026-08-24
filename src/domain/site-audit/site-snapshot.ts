import { z } from "zod";

// Ảnh chụp cấu trúc + nội dung của một website CÓ SẴN. Đây là mảnh ghép biến
// nền tảng từ "chỉ dùng được cho web mới" thành "cải tiến được web đang chạy":
// mọi module về sau đọc ảnh chụp này làm bối cảnh nên không còn đề xuất trùng
// với thứ khách đã có.
//
// File này THUẦN (không gọi mạng) để test được — phần tải dữ liệu nằm ở tầng
// infrastructure.

export const siteSourceIds = ["wordpress", "sitemap", "manual"] as const;
export type SiteSource = (typeof siteSourceIds)[number];

export interface SitePage {
  title: string;
  /** Đường dẫn tương đối, luôn bắt đầu bằng "/". */
  slug: string;
  /** Slug của trang cha (nếu nền tảng có khai báo quan hệ). */
  parentSlug?: string;
  /** Số từ trong nội dung — dùng để phát hiện trang mỏng. */
  wordCount?: number;
  /** Trích đoạn nội dung để AI đánh giá chất lượng. */
  excerpt?: string;
}

export interface SiteSnapshot {
  source: SiteSource;
  siteUrl: string;
  pages: SitePage[];
  /** Ghi chú quá trình quét để hiển thị cho người dùng (không phải lỗi). */
  notes: string[];
}

export const sitePageSchema = z.object({
  title: z.string(),
  slug: z.string(),
  parentSlug: z.string().optional(),
  wordCount: z.number().optional(),
  excerpt: z.string().optional(),
});

/* --------------------------- Chuẩn hoá đường dẫn --------------------------- */

/** Đưa URL tuyệt đối hoặc đường dẫn bất kỳ về dạng "/duong-dan" thống nhất. */
export function toSlug(value: string): string {
  const raw = (value ?? "").trim();
  if (!raw) return "/";
  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      path = new URL(raw).pathname;
    } catch {
      return "/";
    }
  }
  // Bỏ dấu / thừa ở cuối nhưng giữ lại "/" cho trang chủ.
  path = path.replace(/\/+$/, "");
  if (!path.startsWith("/")) path = `/${path}`;
  return path || "/";
}

/** "/khoa-hoc/lap-trinh-co-ban" → "Lap trinh co ban" (khi không có tiêu đề). */
export function titleFromSlug(slug: string): string {
  const last = slug.split("/").filter(Boolean).pop() ?? "";
  if (!last) return "Trang chủ";
  const words = last.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/* ----------------------------- Parser sitemap.xml ---------------------------- */

/**
 * Rút danh sách URL từ nội dung sitemap.xml. Hỗ trợ cả sitemap index (file
 * sitemap trỏ tới nhiều sitemap con) — trả riêng để bên gọi tải tiếp.
 */
export function parseSitemapXml(xml: string): {
  urls: string[];
  nestedSitemaps: string[];
} {
  const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) =>
    decodeXmlEntities(match[1]),
  );
  // Trong <sitemapindex> thì mỗi <loc> là một sitemap con, không phải trang.
  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  return isIndex
    ? { urls: [], nestedSitemaps: locs }
    : { urls: locs, nestedSitemaps: [] };
}

/** Tìm dòng "Sitemap: <url>" trong robots.txt. */
export function parseSitemapsFromRobots(robots: string): string[] {
  return [...robots.matchAll(/^\s*sitemap:\s*(\S+)\s*$/gim)].map(
    (match) => match[1],
  );
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/* ------------------------------ Dựng cây & mô tả ----------------------------- */

/**
 * Suy ra quan hệ cha-con từ chính đường dẫn khi nền tảng không khai báo.
 * "/khoa-hoc/lap-trinh" có cha là "/khoa-hoc" nếu trang đó tồn tại.
 */
export function inferParents(pages: SitePage[]): SitePage[] {
  const bySlug = new Set(pages.map((page) => page.slug));
  return pages.map((page) => {
    if (page.parentSlug) return page;
    const segments = page.slug.split("/").filter(Boolean);
    for (let cut = segments.length - 1; cut >= 1; cut -= 1) {
      const candidate = `/${segments.slice(0, cut).join("/")}`;
      if (bySlug.has(candidate)) return { ...page, parentSlug: candidate };
    }
    return page;
  });
}

/**
 * Kết xuất ảnh chụp thành text thụt lề để nhúng vào prompt. Dùng đúng định dạng
 * "Tên trang | /duong-dan" của Module 1 nên AI trả lời cùng một khuôn.
 */
export function snapshotToOutline(snapshot: SiteSnapshot): string {
  const pages = inferParents(snapshot.pages);
  const children = new Map<string, SitePage[]>();
  const roots: SitePage[] = [];
  for (const page of pages) {
    if (page.parentSlug && pages.some((p) => p.slug === page.parentSlug)) {
      const list = children.get(page.parentSlug) ?? [];
      list.push(page);
      children.set(page.parentSlug, list);
    } else {
      roots.push(page);
    }
  }

  const lines: string[] = [];
  const walk = (page: SitePage, depth: number): void => {
    const indent = "  ".repeat(depth);
    const meta =
      page.wordCount !== undefined ? `  (${page.wordCount} từ)` : "";
    lines.push(`${indent}${page.title} | ${page.slug}${meta}`);
    for (const child of children.get(page.slug) ?? []) walk(child, depth + 1);
  };
  for (const root of roots) walk(root, 0);
  return lines.join("\n");
}

/**
 * Trích nội dung thật của các trang để AI hiểu site NÓI VỀ GÌ.
 *
 * Thiếu phần này, AI chỉ nhìn được tên trang + đường dẫn nên buộc phải suy đoán
 * ngành nghề từ ô "từ khóa" người dùng nhập — gõ sai một chữ là toàn bộ khuyến
 * nghị lệch sang ngành khác. Đưa nội dung thật vào là cách chống bịa hiệu quả
 * nhất vì AI có căn cứ để bám.
 */
export function snapshotToContentDigest(
  snapshot: SiteSnapshot,
  options: { maxPages?: number; charsPerPage?: number } = {},
): string {
  const maxPages = options.maxPages ?? 12;
  const charsPerPage = options.charsPerPage ?? 320;
  const withContent = snapshot.pages.filter(
    (page) => (page.excerpt ?? "").trim().length > 0,
  );
  if (withContent.length === 0) return "";

  // Ưu tiên trang dày chữ nhất — đó là nơi thể hiện rõ nhất site làm gì.
  const ranked = [...withContent].sort(
    (a, b) => (b.wordCount ?? 0) - (a.wordCount ?? 0),
  );
  return ranked
    .slice(0, maxPages)
    .map(
      (page) =>
        `### ${page.title} (${page.slug})\n${(page.excerpt ?? "").slice(0, charsPerPage)}`,
    )
    .join("\n\n");
}

/** Thống kê nhanh để hiển thị và để AI biết quy mô site. */
export function summarizeSnapshot(snapshot: SiteSnapshot): {
  total: number;
  thin: number;
  topLevel: number;
  maxDepth: number;
} {
  const pages = inferParents(snapshot.pages);
  const depthOf = (page: SitePage): number => {
    let depth = 0;
    let cursor: SitePage | undefined = page;
    const seen = new Set<string>();
    while (cursor?.parentSlug && !seen.has(cursor.slug)) {
      seen.add(cursor.slug);
      cursor = pages.find((item) => item.slug === cursor!.parentSlug);
      depth += 1;
    }
    return depth;
  };
  return {
    total: pages.length,
    // Dưới 300 từ thường bị đánh giá là nội dung mỏng.
    thin: pages.filter(
      (page) => page.wordCount !== undefined && page.wordCount < 300,
    ).length,
    topLevel: pages.filter((page) => !page.parentSlug).length,
    maxDepth: pages.reduce((max, page) => Math.max(max, depthOf(page)), 0),
  };
}

// Cố ý KHÔNG dùng chỉ thị "server-only": bộ quét chỉ gọi HTTP công khai, không
// chạm secret cũng không chạm cơ sở dữ liệu, nên cần chạy được cả trong script
// kiểm thử ở Node (npm run modules:audit-live). Hậu tố .server.ts vẫn thể hiện
// rõ đây là mã chỉ dùng phía máy chủ.

import {
  inferParents,
  parseSitemapXml,
  parseSitemapsFromRobots,
  titleFromSlug,
  toSlug,
  type SitePage,
  type SiteSnapshot,
} from "@/domain/site-audit/site-snapshot";

// Đọc cấu trúc + nội dung của một website CÓ SẴN.
//
// Thứ tự ưu tiên:
//   1. WordPress REST API — giàu nhất (tiêu đề, quan hệ cha-con, nội dung).
//      Tự nhận diện site tự host và site WordPress.com (Simple site không mở
//      /wp-json/ trên tên miền, phải đi qua public-api) — dùng lại đúng cách
//      nhận diện của Module 12 nên hành vi nhất quán.
//   2. sitemap.xml — mọi website đều có, nhưng chỉ lấy được danh sách URL.
//
// Chỉ đọc dữ liệu CÔNG KHAI, không cần thông tin đăng nhập.

const MAX_PAGES = 60;
const FETCH_TIMEOUT_MS = 20_000;

export async function scanWebsite(rawUrl: string): Promise<SiteSnapshot> {
  const siteUrl = normalizeSiteUrl(rawUrl);
  const notes: string[] = [];

  const wordpress = await tryWordpress(siteUrl, notes);
  if (wordpress && wordpress.length > 0) {
    return { source: "wordpress", siteUrl, pages: wordpress, notes };
  }

  const sitemap = await trySitemap(siteUrl, notes);
  if (sitemap.length > 0) {
    return { source: "sitemap", siteUrl, pages: sitemap, notes };
  }

  throw new Error(
    `Không đọc được cấu trúc của ${siteUrl}. Website cần mở REST API của WordPress hoặc có file sitemap.xml công khai.`,
  );
}

/* ------------------------------- WordPress -------------------------------- */

async function tryWordpress(
  siteUrl: string,
  notes: string[],
): Promise<SitePage[] | null> {
  const base = await resolveWordpressApiBase(siteUrl);
  if (!base) return null;

  const pages: SitePage[] = [];
  // Lấy cả trang tĩnh lẫn bài viết; trang tĩnh mới có quan hệ cha-con.
  for (const type of ["pages", "posts"] as const) {
    const items = await fetchJson<WordpressItem[]>(
      `${base}/${type}?per_page=${Math.min(MAX_PAGES, 100)}&status=publish&_fields=id,parent,slug,title,content,link`,
    );
    if (!items || !Array.isArray(items)) continue;
    for (const item of items) {
      if (pages.length >= MAX_PAGES) break;
      pages.push(toSitePage(item, items));
    }
  }

  if (pages.length === 0) return null;
  notes.push(
    `Đọc qua WordPress REST API — lấy được ${pages.length} trang/bài kèm nội dung.`,
  );
  return inferParents(pages);
}

interface WordpressItem {
  id?: number;
  parent?: number;
  slug?: string;
  link?: string;
  title?: { rendered?: string };
  content?: { rendered?: string };
}

function toSitePage(item: WordpressItem, all: WordpressItem[]): SitePage {
  const slug = item.link ? toSlug(item.link) : `/${item.slug ?? ""}`;
  const parent =
    item.parent && item.parent !== 0
      ? all.find((candidate) => candidate.id === item.parent)
      : undefined;
  const text = stripHtml(item.content?.rendered ?? "");
  return {
    title: decodeEntities(item.title?.rendered ?? "") || titleFromSlug(slug),
    slug,
    parentSlug: parent?.link ? toSlug(parent.link) : undefined,
    wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0,
    excerpt: text.slice(0, 400) || undefined,
  };
}

/**
 * Trả về gốc của REST API, hoặc null nếu không phải WordPress.
 * Dò /wp-json/ có đi theo chuyển hướng (tên miền riêng gắn vào WordPress.com
 * trỏ về *.wordpress.com), giống hệt Module 12.
 */
async function resolveWordpressApiBase(siteUrl: string): Promise<string | null> {
  try {
    const probe = await fetchWithTimeout(`${siteUrl}/wp-json/`, {
      redirect: "follow",
    });
    const canonical = originOf(probe.url) ?? siteUrl;
    if (probe.status !== 404) return `${canonical}/wp-json/wp/v2`;

    // 404 → có thể là WordPress.com Simple site: REST đi qua public-api.
    const host = hostOf(canonical);
    if (!host) return null;
    const viaPublicApi = `https://public-api.wordpress.com/wp/v2/sites/${host}`;
    const check = await fetchWithTimeout(`${viaPublicApi}/pages?per_page=1`, {
      redirect: "follow",
    });
    return check.ok ? viaPublicApi : null;
  } catch {
    return null;
  }
}

/* -------------------------------- sitemap.xml ------------------------------- */

async function trySitemap(
  siteUrl: string,
  notes: string[],
): Promise<SitePage[]> {
  const candidates = new Set<string>([`${siteUrl}/sitemap.xml`]);

  // robots.txt thường chỉ đúng vị trí sitemap (nhiều site đặt chỗ khác).
  const robots = await fetchText(`${siteUrl}/robots.txt`);
  if (robots) {
    for (const found of parseSitemapsFromRobots(robots)) candidates.add(found);
  }

  const urls = new Set<string>();
  const visited = new Set<string>();
  const queue = [...candidates];
  // Giới hạn 5 file để không đi lan man trên site rất lớn.
  while (queue.length > 0 && visited.size < 5 && urls.size < MAX_PAGES) {
    const target = queue.shift()!;
    if (visited.has(target)) continue;
    visited.add(target);
    const xml = await fetchText(target);
    if (!xml) continue;
    const parsed = parseSitemapXml(xml);
    for (const url of parsed.urls) urls.add(url);
    for (const nested of parsed.nestedSitemaps) queue.push(nested);
  }

  if (urls.size === 0) return [];
  notes.push(
    `Đọc qua sitemap.xml — lấy được ${urls.size} địa chỉ (không có nội dung trang).`,
  );

  const pages = [...urls].slice(0, MAX_PAGES).map((url) => {
    const slug = toSlug(url);
    return { title: titleFromSlug(slug), slug };
  });
  return inferParents(pages);
}

/* --------------------------------- Tiện ích -------------------------------- */

function normalizeSiteUrl(value: string): string {
  const trimmed = (value ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("Thiếu địa chỉ website.");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return `${url.protocol}//${url.host}`;
  } catch {
    throw new Error(`Địa chỉ website không hợp lệ: ${value}`);
  }
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(url, { redirect: "follow" });
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetchWithTimeout(url, { redirect: "follow" });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function originOf(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function hostOf(value: string): string | null {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

// Cây sitemap có cấu trúc — dùng cho sơ đồ cây, bản chữ sửa được và xuất file.
// Parser THUẦN (không phụ thuộc server) để: (1) server sinh & lưu `structure`
// ngay lúc chạy; (2) client dựng lại cây khi người dùng sửa bản chữ.
//
// Định dạng chuẩn mỗi dòng:  Nhãn hiển thị | /slug
// Thụt đầu dòng 2 dấu cách = một cấp con. Phần "| /slug" là tùy chọn.
// Vẫn đọc được dữ liệu cũ (URL tuyệt đối, "Cha > Con") để job cũ không vỡ.

import { z } from "zod";

export interface SitemapNode {
  label: string;
  // Đường dẫn tương đối (bắt đầu bằng "/"). Không có thì để trống.
  slug?: string;
  children: SitemapNode[];
}

export const sitemapNodeSchema: z.ZodType<SitemapNode> = z.lazy(() =>
  z.object({
    label: z.string(),
    slug: z.string().optional(),
    children: z.array(sitemapNodeSchema),
  }),
);

const MAX_NODES = 120;
const LEADING_MARKER = /^([-*•·▪◦●○>»–—]+|\d+[.)])\s*/;
// Chỉ còn ký tự mũi tên: "/" và "|" nay thuộc về slug nên không được coi là
// dấu tách đường dẫn nữa.
const PATH_SEPARATOR = /\s*[>›»]\s*/;

/**
 * Dựng cây sitemap từ text. Nhận diện phân cấp theo thụt đầu dòng (tab hoặc 2
 * space = 1 cấp), hoặc đường dẫn nội dòng "Cha > Con > Cháu".
 * Luôn trả về một cây (không ném lỗi); rỗng thì trả gốc không con.
 */
export function parseSitemapStructure(
  text: string,
  rootLabel: string,
): SitemapNode {
  const root: SitemapNode = {
    label: cleanRootLabel(rootLabel),
    children: [],
  };
  if (typeof text !== "string" || !text.trim()) return root;

  const stack: Array<{ depth: number; node: SitemapNode }> = [
    { depth: -1, node: root },
  ];
  let count = 0;

  for (const raw of text.split(/\r?\n/)) {
    if (count >= MAX_NODES) break;
    if (!raw.trim()) continue;

    const leading = raw.match(/^[\t ]*/)?.[0] ?? "";
    const tabs = (leading.match(/\t/g) ?? []).length;
    const spaces = (leading.match(/ /g) ?? []).length;
    const depth = tabs + Math.floor(spaces / 2);

    const cleaned = stripMarker(raw.trim());
    if (!cleaned) continue;

    const entry = splitLabelAndSlug(cleaned);
    // Dòng chỉ chứa địa chỉ trang gốc ("/" hoặc URL trang chủ) → bỏ, vì gốc cây
    // đã đại diện cho trang chủ rồi.
    if (!entry.label && !entry.slug) continue;
    if (!entry.label && entry.slug === "/") continue;

    // Đường dẫn nội dòng "Cha > Con" → nối vào gốc theo từng cấp.
    const parts = entry.label.split(PATH_SEPARATOR).filter(Boolean);
    if (parts.length > 1) {
      let parent = root;
      parts.forEach((part, index) => {
        const label = clampLabel(part);
        let child = parent.children.find((item) => item.label === label);
        if (!child) {
          if (count >= MAX_NODES) return;
          child = { label, children: [] };
          if (index === parts.length - 1 && entry.slug) child.slug = entry.slug;
          parent.children.push(child);
          count += 1;
        }
        parent = child;
      });
      continue;
    }

    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;
    const node: SitemapNode = { label: clampLabel(entry.label), children: [] };
    if (entry.slug) node.slug = entry.slug;
    parent.children.push(node);
    count += 1;
    stack.push({ depth, node });
  }

  return root;
}

/**
 * Tách "Nhãn | /slug" thành hai phần. Vẫn đọc được dữ liệu cũ:
 *  - URL tuyệt đối  → slug là đường dẫn, nhãn suy ra từ đoạn cuối.
 *  - Chỉ "/duong-dan" → slug là chính nó, nhãn suy ra từ đoạn cuối.
 */
export function splitLabelAndSlug(value: string): {
  label: string;
  slug?: string;
} {
  const trimmed = value.trim();

  // Dạng chuẩn: "Nhãn | /slug" (lấy dấu | cuối cùng để nhãn được phép chứa |).
  const pipe = trimmed.lastIndexOf("|");
  if (pipe > 0) {
    const label = trimmed.slice(0, pipe).trim();
    const rest = trimmed.slice(pipe + 1).trim();
    const slug = normalizeSlug(rest);
    if (label) return slug ? { label, slug } : { label };
  }

  // Dữ liệu cũ: URL tuyệt đối.
  if (/^https?:\/\//i.test(trimmed)) {
    const path = pathnameOf(trimmed);
    if (path === null) return { label: trimmed };
    if (path === "/" || path === "") return { label: "", slug: "/" };
    return { label: labelFromSlug(path), slug: path };
  }

  // Dữ liệu cũ: chỉ có đường dẫn.
  if (trimmed.startsWith("/")) {
    const slug = normalizeSlug(trimmed);
    if (slug === "/") return { label: "", slug: "/" };
    return slug ? { label: labelFromSlug(slug), slug } : { label: trimmed };
  }

  return { label: trimmed };
}

/** Xuất lại thành text thụt lề để người dùng sửa và để tải .txt. */
export function sitemapToIndentedText(root: SitemapNode): string {
  const lines: string[] = [];
  const walk = (node: SitemapNode, depth: number): void => {
    for (const child of node.children) {
      const indent = "  ".repeat(depth);
      lines.push(
        child.slug ? `${indent}${child.label} | ${child.slug}` : `${indent}${child.label}`,
      );
      walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return lines.join("\n");
}

// Dạng PHẲNG của cây: mỗi trang một dòng kèm cấp bậc. Sửa dạng phẳng dễ hơn
// nhiều so với sửa cây lồng nhau (thụt/bỏ thụt = depth ±1, đổi chỗ = hoán vị
// phần tử mảng), nên trình sửa dạng khối dùng cấu trúc này.
export interface SitemapRow {
  label: string;
  slug?: string;
  depth: number;
}

export function sitemapRowsFromTree(root: SitemapNode): SitemapRow[] {
  const rows: SitemapRow[] = [];
  const walk = (node: SitemapNode, depth: number): void => {
    for (const child of node.children) {
      rows.push({ label: child.label, slug: child.slug, depth });
      walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return rows;
}

/**
 * Ghép các dòng phẳng thành text thụt lề. Tự vá cấp bậc không hợp lệ (một dòng
 * không được sâu hơn dòng trước quá 1 cấp) để cây dựng ra luôn đúng dù người
 * dùng bấm thụt nhiều lần hay xoá mất dòng cha.
 */
export function sitemapTextFromRows(rows: SitemapRow[]): string {
  const lines: string[] = [];
  let previousDepth = -1;
  for (const row of rows) {
    const label = row.label.trim();
    const slug = row.slug?.trim();
    if (!label && !slug) continue;
    const depth = Math.max(0, Math.min(row.depth, previousDepth + 1));
    previousDepth = depth;
    const indent = "  ".repeat(depth);
    lines.push(slug ? `${indent}${label} | ${slug}` : `${indent}${label}`);
  }
  return lines.join("\n");
}

/** Tổng số node (không tính gốc). */
export function countSitemapNodes(node: SitemapNode): number {
  return node.children.reduce(
    (total, child) => total + 1 + countSitemapNodes(child),
    0,
  );
}

/**
 * Xuất sitemap.xml đúng chuẩn sitemaps.org để nộp cho Google Search Console.
 * Chỉ gồm node có slug — node chỉ là nhóm điều hướng (không có trang thật) bị
 * bỏ qua, vì nộp URL không truy cập được sẽ bị Google báo lỗi.
 */
export function sitemapToXml(root: SitemapNode, siteUrl: string): string {
  const base = normalizeSiteUrl(siteUrl);
  const urls: string[] = [`${base}/`];
  const walk = (node: SitemapNode): void => {
    for (const child of node.children) {
      if (child.slug && child.slug !== "/") {
        urls.push(`${base}${child.slug}`);
      }
      walk(child);
    }
  };
  walk(root);

  const unique = Array.from(new Set(urls));
  const body = unique
    .map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function normalizeSiteUrl(value: string): string {
  const trimmed = (value ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "https://example.com";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function pathnameOf(value: string): string | null {
  try {
    return new URL(value).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return null;
  }
}

function normalizeSlug(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return pathnameOf(trimmed) ?? undefined;
  if (!trimmed.startsWith("/")) return `/${trimmed}`;
  return trimmed;
}

/** "/khoa-hoc/lap-trinh-co-ban" → "Lap trinh co ban" (chỉ cho dữ liệu cũ). */
function labelFromSlug(slug: string): string {
  const last = slug.split("/").filter(Boolean).pop() ?? "";
  if (!last) return "Trang chủ";
  const words = last.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function cleanRootLabel(value: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "Trang chủ";
  // Tên dự án đôi khi là URL — hiện tên miền cho gọn.
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).host;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function stripMarker(value: string): string {
  let out = value;
  // Bóc nhiều lớp marker (ví dụ "- • Dịch vụ").
  for (let i = 0; i < 3; i += 1) {
    const next = out.replace(LEADING_MARKER, "");
    if (next === out) break;
    out = next;
  }
  return out.trim();
}

function clampLabel(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 48 ? `${trimmed.slice(0, 47)}…` : trimmed;
}

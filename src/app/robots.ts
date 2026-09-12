import type { MetadataRoute } from "next";

/**
 * Antigravity là công cụ NỘI BỘ có đăng nhập — không có gì để máy tìm kiếm
 * lập chỉ mục, và trang đăng nhập của một công cụ vận hành thì càng không nên
 * xuất hiện trên Google.
 *
 * Trước đây `/robots.txt` trả 404 HTML (Lighthouse báo "robots.txt is not
 * valid"). Không có tệp thì mặc định của máy tìm kiếm là "cho phép tất cả" —
 * ngược hẳn với thứ một công cụ nội bộ cần.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}

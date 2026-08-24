import { describe, expect, it } from "vitest";
import {
  parseSitemapStructure,
  countSitemapNodes,
  sitemapRowsFromTree,
  sitemapTextFromRows,
  sitemapToIndentedText,
  sitemapToXml,
} from "@/domain/sitemap/sitemap-structure";

describe("parseSitemapStructure", () => {
  it("danh sách phẳng → tất cả là con trực tiếp của gốc, bóc marker", () => {
    const tree = parseSitemapStructure(
      "- Trang chủ\n- Dịch vụ\n• Về chúng tôi\n1. Liên hệ",
      "Acme",
    );
    expect(tree.label).toBe("Acme");
    expect(tree.children.map((c) => c.label)).toEqual([
      "Trang chủ",
      "Dịch vụ",
      "Về chúng tôi",
      "Liên hệ",
    ]);
    expect(tree.children.every((c) => c.children.length === 0)).toBe(true);
    expect(countSitemapNodes(tree)).toBe(4);
  });

  it("thụt đầu dòng → phân cấp cha/con", () => {
    const tree = parseSitemapStructure(
      "Dịch vụ\n  SEO tổng thể\n  GEO\nVề chúng tôi\n  Đội ngũ",
      "Site",
    );
    expect(tree.children.map((c) => c.label)).toEqual([
      "Dịch vụ",
      "Về chúng tôi",
    ]);
    expect(tree.children[0].children.map((c) => c.label)).toEqual([
      "SEO tổng thể",
      "GEO",
    ]);
    expect(tree.children[1].children.map((c) => c.label)).toEqual(["Đội ngũ"]);
  });

  it("đường dẫn nội dòng 'Cha > Con' → nối theo path, gộp cha trùng", () => {
    const tree = parseSitemapStructure(
      "Dịch vụ > SEO\nDịch vụ > GEO\nLiên hệ",
      "Site",
    );
    expect(tree.children.map((c) => c.label)).toEqual(["Dịch vụ", "Liên hệ"]);
    expect(tree.children[0].children.map((c) => c.label)).toEqual(["SEO", "GEO"]);
  });

  it("text rỗng → gốc không con; nhãn gốc rỗng có mặc định", () => {
    const tree = parseSitemapStructure("", "");
    expect(tree.label).toBe("Trang chủ");
    expect(tree.children).toHaveLength(0);
    expect(countSitemapNodes(tree)).toBe(0);
  });

  it("giới hạn số node để tránh output bất thường", () => {
    const many = Array.from({ length: 400 }, (_, i) => `Muc ${i}`).join("\n");
    const tree = parseSitemapStructure(many, "Big");
    expect(countSitemapNodes(tree)).toBeLessThanOrEqual(120);
  });
});

describe("nhãn + slug (định dạng 'Tên trang | /duong-dan')", () => {
  it("tách nhãn dễ đọc và slug, giữ phân cấp theo thụt lề", () => {
    const tree = parseSitemapStructure(
      [
        "Giới thiệu | /gioi-thieu",
        "Khóa học",
        "  Lập trình cơ bản | /khoa-hoc/lap-trinh-co-ban",
        "  Lập trình web | /khoa-hoc/lap-trinh-web",
      ].join("\n"),
      "Acme",
    );
    expect(tree.children.map((node) => node.label)).toEqual([
      "Giới thiệu",
      "Khóa học",
    ]);
    expect(tree.children[0].slug).toBe("/gioi-thieu");
    // Mục cha thuần điều hướng không có slug.
    expect(tree.children[1].slug).toBeUndefined();
    expect(tree.children[1].children[0]).toMatchObject({
      label: "Lập trình cơ bản",
      slug: "/khoa-hoc/lap-trinh-co-ban",
    });
  });

  it("đọc được dữ liệu cũ dạng URL tuyệt đối (job đã lưu trước đây)", () => {
    const tree = parseSitemapStructure(
      [
        "https://fsdfsdfdsf.vn/",
        "https://fsdfsdfdsf.vn/gioi-thieu",
        "Khóa học",
        "  https://fsdfsdfdsf.vn/khoa-hoc/lap-trinh-co-ban",
      ].join("\n"),
      "https://fsdfsdfdsf.vn",
    );
    // Nhãn gốc là URL → rút gọn còn tên miền.
    expect(tree.label).toBe("fsdfsdfdsf.vn");
    // Dòng trang chủ bị bỏ vì gốc cây đã đại diện cho nó.
    // Nhãn suy ra từ đoạn cuối đường dẫn, gạch ngang đổi thành dấu cách.
    expect(tree.children.map((node) => node.label)).toEqual([
      "Gioi thieu",
      "Khóa học",
    ]);
    expect(tree.children[0].slug).toBe("/gioi-thieu");
    expect(tree.children[1].children[0].slug).toBe(
      "/khoa-hoc/lap-trinh-co-ban",
    );
  });

  it("round-trip: dựng cây rồi xuất lại đúng text thụt lề", () => {
    const source = [
      "Giới thiệu | /gioi-thieu",
      "Khóa học",
      "  Lập trình web | /khoa-hoc/lap-trinh-web",
    ].join("\n");
    expect(sitemapToIndentedText(parseSitemapStructure(source, "Acme"))).toBe(
      source,
    );
  });
});

describe("dạng phẳng cho trình sửa khối", () => {
  const source = [
    "Giới thiệu | /gioi-thieu",
    "Khóa học",
    "  Lập trình web | /khoa-hoc/lap-trinh-web",
    "    Nâng cao | /khoa-hoc/lap-trinh-web/nang-cao",
  ].join("\n");

  it("cây → danh sách phẳng kèm cấp bậc", () => {
    const rows = sitemapRowsFromTree(parseSitemapStructure(source, "Acme"));
    expect(rows).toEqual([
      { label: "Giới thiệu", slug: "/gioi-thieu", depth: 0 },
      { label: "Khóa học", slug: undefined, depth: 0 },
      { label: "Lập trình web", slug: "/khoa-hoc/lap-trinh-web", depth: 1 },
      {
        label: "Nâng cao",
        slug: "/khoa-hoc/lap-trinh-web/nang-cao",
        depth: 2,
      },
    ]);
  });

  it("danh sách phẳng → text thụt lề (khứ hồi không đổi)", () => {
    const rows = sitemapRowsFromTree(parseSitemapStructure(source, "Acme"));
    expect(sitemapTextFromRows(rows)).toBe(source);
  });

  it("vá cấp bậc không hợp lệ: không cho nhảy quá 1 cấp", () => {
    // Người dùng bấm thụt nhiều lần hoặc xoá mất dòng cha.
    const text = sitemapTextFromRows([
      { label: "Trang A", depth: 0 },
      { label: "Trang B", depth: 5 },
      { label: "Trang C", depth: 9 },
    ]);
    expect(text).toBe("Trang A\n  Trang B\n    Trang C");
    const tree = parseSitemapStructure(text, "Acme");
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].children[0].label).toBe("Trang B");
  });

  it("bỏ qua dòng trống và dòng chỉ có khoảng trắng", () => {
    expect(
      sitemapTextFromRows([
        { label: "Trang A", depth: 0 },
        { label: "   ", slug: "  ", depth: 0 },
        { label: "Trang B", depth: 0 },
      ]),
    ).toBe("Trang A\nTrang B");
  });
});

describe("sitemapToXml", () => {
  it("xuất đúng chuẩn sitemaps.org, chỉ gồm trang có slug", () => {
    const tree = parseSitemapStructure(
      [
        "Giới thiệu | /gioi-thieu",
        "Khóa học",
        "  Lập trình web | /khoa-hoc/lap-trinh-web",
      ].join("\n"),
      "Acme",
    );
    const xml = sitemapToXml(tree, "https://acme.vn/");

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(xml).toContain("<loc>https://acme.vn/</loc>");
    expect(xml).toContain("<loc>https://acme.vn/gioi-thieu</loc>");
    expect(xml).toContain("<loc>https://acme.vn/khoa-hoc/lap-trinh-web</loc>");
    // "Khóa học" chỉ là nhóm điều hướng, không có URL thật → không được nộp.
    expect(xml).not.toContain("Khóa");
  });

  it("thêm https:// khi thiếu và escape ký tự đặc biệt", () => {
    const tree = parseSitemapStructure("Tìm kiếm | /tim?q=a&b", "Acme");
    const xml = sitemapToXml(tree, "acme.vn");
    expect(xml).toContain("<loc>https://acme.vn/</loc>");
    expect(xml).toContain("&amp;");
  });
});

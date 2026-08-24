import { describe, expect, it } from "vitest";
import {
  inferParents,
  parseSitemapXml,
  parseSitemapsFromRobots,
  snapshotToOutline,
  summarizeSnapshot,
  titleFromSlug,
  toSlug,
  type SiteSnapshot,
} from "@/domain/site-audit/site-snapshot";

describe("chuẩn hoá đường dẫn", () => {
  it("đưa URL tuyệt đối và đường dẫn về cùng một dạng", () => {
    expect(toSlug("https://vidu.com/khoa-hoc/")).toBe("/khoa-hoc");
    expect(toSlug("https://vidu.com/")).toBe("/");
    expect(toSlug("khoa-hoc")).toBe("/khoa-hoc");
    expect(toSlug("/khoa-hoc/lap-trinh/")).toBe("/khoa-hoc/lap-trinh");
    expect(toSlug("")).toBe("/");
  });

  it("suy ra tên trang từ đường dẫn khi thiếu tiêu đề", () => {
    expect(titleFromSlug("/khoa-hoc/lap-trinh-co-ban")).toBe("Lap trinh co ban");
    expect(titleFromSlug("/")).toBe("Trang chủ");
  });
});

describe("đọc sitemap", () => {
  it("rút danh sách URL và giải mã ký tự đặc biệt", () => {
    const xml = `<?xml version="1.0"?><urlset>
      <url><loc>https://vidu.com/a</loc></url>
      <url><loc>https://vidu.com/b?x=1&amp;y=2</loc></url>
    </urlset>`;
    const parsed = parseSitemapXml(xml);
    expect(parsed.urls).toEqual([
      "https://vidu.com/a",
      "https://vidu.com/b?x=1&y=2",
    ]);
    expect(parsed.nestedSitemaps).toHaveLength(0);
  });

  it("phân biệt sitemap index (chứa sitemap con) với sitemap thường", () => {
    const xml = `<?xml version="1.0"?><sitemapindex>
      <sitemap><loc>https://vidu.com/sitemap-1.xml</loc></sitemap>
      <sitemap><loc>https://vidu.com/sitemap-2.xml</loc></sitemap>
    </sitemapindex>`;
    const parsed = parseSitemapXml(xml);
    expect(parsed.urls).toHaveLength(0);
    expect(parsed.nestedSitemaps).toHaveLength(2);
  });

  it("tìm được vị trí sitemap khai báo trong robots.txt", () => {
    const robots = [
      "User-agent: *",
      "Disallow: /wp-admin/",
      "Sitemap: https://vidu.com/sitemap.xml",
      "sitemap: https://vidu.com/news-sitemap.xml",
    ].join("\n");
    expect(parseSitemapsFromRobots(robots)).toEqual([
      "https://vidu.com/sitemap.xml",
      "https://vidu.com/news-sitemap.xml",
    ]);
  });
});

describe("suy ra quan hệ cha-con", () => {
  it("dựa vào đường dẫn khi nền tảng không khai báo", () => {
    const pages = inferParents([
      { title: "Khóa học", slug: "/khoa-hoc" },
      { title: "Lập trình", slug: "/khoa-hoc/lap-trinh" },
      { title: "Cơ bản", slug: "/khoa-hoc/lap-trinh/co-ban" },
      { title: "Liên hệ", slug: "/lien-he" },
    ]);
    expect(pages[1].parentSlug).toBe("/khoa-hoc");
    expect(pages[2].parentSlug).toBe("/khoa-hoc/lap-trinh");
    expect(pages[3].parentSlug).toBeUndefined();
  });

  it("không gán cha nếu trang cha không tồn tại trên site", () => {
    const pages = inferParents([
      { title: "Cơ bản", slug: "/khoa-hoc/lap-trinh/co-ban" },
    ]);
    expect(pages[0].parentSlug).toBeUndefined();
  });

  it("giữ nguyên quan hệ đã có sẵn từ nền tảng", () => {
    const pages = inferParents([
      { title: "Cha", slug: "/cha" },
      { title: "Con", slug: "/hoan-toan-khac", parentSlug: "/cha" },
    ]);
    expect(pages[1].parentSlug).toBe("/cha");
  });
});

describe("kết xuất và thống kê", () => {
  const snapshot: SiteSnapshot = {
    source: "wordpress",
    siteUrl: "https://vidu.com",
    notes: [],
    pages: [
      { title: "Trang chủ", slug: "/", wordCount: 800 },
      { title: "Khóa học", slug: "/khoa-hoc", wordCount: 500 },
      { title: "Lập trình", slug: "/khoa-hoc/lap-trinh", wordCount: 120 },
      { title: "Liên hệ", slug: "/lien-he", wordCount: 90 },
    ],
  };

  it("xuất text thụt lề đúng khuôn 'Tên trang | /duong-dan'", () => {
    const outline = snapshotToOutline(snapshot);
    expect(outline).toContain("Khóa học | /khoa-hoc");
    // Trang con phải thụt vào 2 dấu cách.
    expect(outline).toContain("  Lập trình | /khoa-hoc/lap-trinh");
    expect(outline).toContain("(800 từ)");
  });

  it("đếm đúng tổng số trang, trang mỏng và độ sâu", () => {
    const stats = summarizeSnapshot(snapshot);
    expect(stats.total).toBe(4);
    // Dưới 300 từ: "Lập trình" (120) và "Liên hệ" (90).
    expect(stats.thin).toBe(2);
    expect(stats.maxDepth).toBe(1);
    expect(stats.topLevel).toBe(3);
  });
});

describe("Module 20 · quét website (scanner giả lập)", () => {
  it("dựng đủ 3 khối đầu ra và nhúng cấu trúc thật vào prompt", async () => {
    const { siteScanModule, setSiteScanner } = await import(
      "@/domain/modules/definitions/site-scan"
    );
    setSiteScanner(async () => ({
      source: "wordpress" as const,
      siteUrl: "https://vidu.com",
      notes: ["Đọc qua WordPress REST API"],
      pages: [
        { title: "Trang chủ", slug: "/", wordCount: 600 },
        { title: "Khóa học", slug: "/khoa-hoc", wordCount: 400 },
        { title: "Khóa nâng cao", slug: "/khoa-nang-cao", wordCount: 80 },
      ],
    }));

    const prompts: string[] = [];
    const output = await siteScanModule.execute({
      input: {
        projectId: "p1",
        idempotencyKey: "44444444-4444-4444-8444-444444444444",
        ai: { provider: "deepseek", model: "deepseek-v4-flash" },
        websiteUrl: "https://vidu.com",
        primaryKeyword: "khóa học",
        language: "Tiếng Việt",
        location: "Việt Nam",
        audienceBrief: "Trung tâm đào tạo mẫu cho kiểm thử nội bộ.",
      } as never,
      upstream: {},
      integrations: {},
      async generate({ prompt }) {
        prompts.push(prompt);
        return "Khóa nâng cao | /khoa-nang-cao | CHUYỂN VỊ TRÍ | nên là con của /khoa-hoc";
      },
    });

    expect(() => siteScanModule.outputSchema.parse(output)).not.toThrow();
    // Cấu trúc quét được phải xuất hiện nguyên vẹn trong khối đầu tiên.
    expect(output.currentStructure).toContain("Khóa học | /khoa-hoc");
    expect(output.currentStructure).toContain("Tổng số trang: 3");
    // Trang dưới 300 từ được đếm là trang mỏng.
    expect(output.currentStructure).toContain("Trang mỏng dưới 300 từ: 1");
    // Prompt đối chiếu phải nhúng cấu trúc thật và ràng buộc đúng 4 nhãn.
    expect(prompts[0]).toContain("/khoa-nang-cao");
    for (const label of ["GIỮ NGUYÊN", "CHUYỂN VỊ TRÍ", "GỘP LẠI", "THÊM MỚI"]) {
      expect(prompts[0]).toContain(label);
    }
    // Bước 2 nhận lại kết quả bước 1 để lập danh sách việc.
    expect(prompts[1]).toContain("CHUYỂN VỊ TRÍ");
  });

  it("báo lỗi rõ khi chưa cấu hình bộ quét ở tầng server", async () => {
    const mod = await import("@/domain/modules/definitions/site-scan");
    mod.setSiteScanner(null as never);
    await expect(
      mod.siteScanModule.execute({
        input: { websiteUrl: "https://vidu.com" } as never,
        upstream: {},
        integrations: {},
        generate: async () => "",
      }),
    ).rejects.toThrow(/bộ quét website/);
  });
});

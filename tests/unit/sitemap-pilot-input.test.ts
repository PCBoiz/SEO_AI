import { describe, expect, it } from "vitest";
import {
  parseCreateSitemapPilotJobInput,
  parseStoredSitemapPilotOutput,
} from "@/domain/sitemap/sitemap-pilot";

const baseSite = {
  reference: "site-1",
  location: "Việt Nam",
  primaryKeyword: "dịch vụ SEO",
  tone: "Chuyên nghiệp",
  language: "Tiếng Việt",
  websiteBrief: "Website cung cấp dịch vụ SEO cho doanh nghiệp Việt Nam.",
};

function input(site: Record<string, unknown>) {
  return {
    projectId: "project",
    idempotencyKey: "188e9d79-82a7-4e55-9f5f-b1882e050def",
    ai: { provider: "deepseek", model: "deepseek-v4-flash" },
    sites: [site],
  };
}

describe("createSitemapPilotJobSchema competitorUrls", () => {
  it("chấp nhận mảng competitorUrls rỗng", () => {
    const result = parseCreateSitemapPilotJobInput(
      input({ ...baseSite, competitorUrls: [] }),
    );
    expect(result.sites[0].competitorUrls).toEqual([]);
  });

  it("mặc định competitorUrls thành [] khi vắng mặt", () => {
    const result = parseCreateSitemapPilotJobInput(input({ ...baseSite }));
    expect(result.sites[0].competitorUrls).toEqual([]);
  });

  it("vẫn chấp nhận tối đa 5 URL đối thủ hợp lệ", () => {
    const urls = [
      "https://a.vn",
      "https://b.vn",
      "https://c.vn",
      "https://d.vn",
      "https://e.vn",
    ];
    const result = parseCreateSitemapPilotJobInput(
      input({ ...baseSite, competitorUrls: urls }),
    );
    expect(result.sites[0].competitorUrls).toEqual(urls);
  });

  it("vẫn từ chối quá 5 URL đối thủ", () => {
    expect(() =>
      parseCreateSitemapPilotJobInput(
        input({
          ...baseSite,
          competitorUrls: Array.from({ length: 6 }, (_, i) => `https://x${i}.vn`),
        }),
      ),
    ).toThrow();
  });

  it("vẫn từ chối URL đối thủ không hợp lệ", () => {
    expect(() =>
      parseCreateSitemapPilotJobInput(
        input({ ...baseSite, competitorUrls: ["không-phải-url"] }),
      ),
    ).toThrow();
  });
});

describe("parseStoredSitemapPilotOutput (đọc khoan dung)", () => {
  it("đọc output hợp lệ do Make ghi", () => {
    const output = parseStoredSitemapPilotOutput({
      contractVersion: "1.0",
      sites: [
        {
          reference: "site-1",
          draftSitemap: "Trang chủ\nDịch vụ",
          selectedSitemap: "Trang chủ",
        },
      ],
    });
    expect(output?.sites[0].draftSitemap).toContain("Trang chủ");
  });

  it("không ném lỗi và bỏ qua key thừa", () => {
    const output = parseStoredSitemapPilotOutput({
      contractVersion: "1.0",
      generatedBy: "make",
      sites: [
        {
          reference: "site-1",
          draftSitemap: "A",
          selectedSitemap: "B",
          extra: "bỏ qua",
        },
      ],
    });
    expect(output).not.toBeNull();
    expect(output?.sites).toHaveLength(1);
  });

  it("ép mảng content thành chuỗi và điền field thiếu", () => {
    const output = parseStoredSitemapPilotOutput({
      contractVersion: "1.0",
      sites: [{ reference: "s", draftSitemap: ["dòng 1", "dòng 2"] }],
    });
    expect(output?.sites[0].draftSitemap).toBe("dòng 1\ndòng 2");
    expect(output?.sites[0].selectedSitemap).toBe("");
  });

  it("trả null khi không có output", () => {
    expect(parseStoredSitemapPilotOutput(null)).toBeNull();
    expect(parseStoredSitemapPilotOutput(undefined)).toBeNull();
  });
});

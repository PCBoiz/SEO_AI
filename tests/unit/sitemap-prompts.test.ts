import { describe, expect, it } from "vitest";
import {
  buildSitemapDraftPrompt,
  buildSitemapSelectionPrompt,
} from "@/domain/sitemap/sitemap-prompts";

const site = {
  reference: "Dự án A",
  location: "Việt Nam",
  primaryKeyword: "dịch vụ SEO",
  tone: "Chuyên nghiệp",
  language: "Tiếng Việt",
  websiteBrief: "Website dịch vụ SEO cho doanh nghiệp nhỏ.",
  competitorUrls: ["https://doi-thu-1.vn", "https://doi-thu-2.vn"],
};

describe("prompt Module 1 app-native", () => {
  it("gồm đủ các field của site trong prompt draft", () => {
    const prompt = buildSitemapDraftPrompt(site);
    expect(prompt).toContain("Tiếng Việt");
    expect(prompt).toContain("Dự án A");
    expect(prompt).toContain("dịch vụ SEO");
    expect(prompt).toContain("https://doi-thu-1.vn\nhttps://doi-thu-2.vn");
  });

  it("fallback khi không có đối thủ (competitor optional)", () => {
    const prompt = buildSitemapDraftPrompt({ ...site, competitorUrls: [] });
    expect(prompt).toContain("Không có website đối thủ được cung cấp");
    expect(prompt).not.toContain("https://doi-thu-1.vn");
  });

  it("prompt chọn trang nhúng draft sitemap và giới hạn 30 trang", () => {
    const prompt = buildSitemapSelectionPrompt("Trang chủ\nDịch vụ\nLiên hệ");
    expect(prompt).toContain("tối đa 30 trang");
    expect(prompt).toContain("Trang chủ\nDịch vụ\nLiên hệ");
    // Giữ định dạng nhãn + slug, không cho model đổi sang URL tuyệt đối.
    expect(prompt).toContain("Tên trang | /duong-dan");
  });

  it("prompt nháp ép đúng định dạng nhãn + slug và cấm URL tuyệt đối", () => {
    const prompt = buildSitemapDraftPrompt(site);
    expect(prompt).toContain("Tên trang dễ hiểu | /duong-dan");
    expect(prompt).toContain("TUYỆT ĐỐI KHÔNG viết địa chỉ đầy đủ");
    // Khung mục bắt buộc lấy lại từ blueprint RIS 3.5 gốc.
    for (const section of [
      "Trang chủ",
      "Giới thiệu",
      "Dịch vụ/Sản phẩm",
      "Điểm đặc biệt",
      "Tài nguyên/Blog",
      "Hỗ trợ/Liên hệ",
      "Pháp lý",
    ]) {
      expect(prompt).toContain(section);
    }
  });
});

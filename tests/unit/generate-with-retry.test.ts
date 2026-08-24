import { describe, expect, it, vi } from "vitest";
import {
  combineValidators,
  generateWithRetry,
  noAbsoluteUrls,
  noListMarkers,
} from "@/domain/modules/generate-with-retry";
import { validateSitemapFormat } from "@/domain/sitemap/sitemap-prompts";

describe("generateWithRetry", () => {
  const request = { prompt: "Liệt kê các trang", maxOutputTokens: 512 };

  it("đạt ngay lần đầu thì không gọi lại (không tốn thêm tiền)", async () => {
    const raw = vi.fn(async () => "Giới thiệu | /gioi-thieu");
    const text = await generateWithRetry(raw, {
      ...request,
      validate: () => [],
    });
    expect(raw).toHaveBeenCalledTimes(1);
    expect(text).toBe("Giới thiệu | /gioi-thieu");
  });

  it("không khai báo validate thì giữ nguyên hành vi cũ", async () => {
    const raw = vi.fn(async () => "bất kỳ");
    await generateWithRetry(raw, request);
    expect(raw).toHaveBeenCalledTimes(1);
  });

  it("sai định dạng thì gọi lại ĐÚNG một lần kèm lời nhắc cụ thể", async () => {
    const raw = vi
      .fn<(input: { prompt: string }) => Promise<string>>()
      .mockResolvedValueOnce("https://vidu.com/gioi-thieu")
      .mockResolvedValueOnce("Giới thiệu | /gioi-thieu");

    const text = await generateWithRetry(raw, {
      ...request,
      validate: noAbsoluteUrls,
    });

    expect(raw).toHaveBeenCalledTimes(2);
    // Lượt hai phải nêu rõ lỗi và kèm câu trả lời cũ để model sửa.
    const second = raw.mock.calls[1][0].prompt;
    expect(second).toContain("SAI ĐỊNH DẠNG");
    expect(second).toContain("https://…");
    expect(second).toContain("https://vidu.com/gioi-thieu");
    expect(text).toBe("Giới thiệu | /gioi-thieu");
  });

  it("lần hai vẫn sai và tệ hơn thì giữ lại bản đầu", async () => {
    const raw = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("1. Giới thiệu")
      .mockResolvedValueOnce("1. Giới thiệu\n2. Dịch vụ\n3. Liên hệ");

    const text = await generateWithRetry(raw, {
      ...request,
      validate: (value) =>
        value
          .split("\n")
          .filter((line) => /^\d+\./.test(line))
          .map((line) => ({ message: `dòng đánh số: ${line}` })),
    });

    expect(text).toBe("1. Giới thiệu");
  });

  it("báo cho bên gọi biết đã phải thử lại", async () => {
    const onRetry = vi.fn();
    const raw = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("https://a.com")
      .mockResolvedValueOnce("Trang | /trang");
    await generateWithRetry(raw, {
      ...request,
      validate: noAbsoluteUrls,
      onRetry,
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("combineValidators gộp lỗi từ nhiều bộ kiểm tra", () => {
    const validator = combineValidators(noAbsoluteUrls, noListMarkers);
    expect(validator("1. https://vidu.com")).toHaveLength(2);
    expect(validator("Giới thiệu | /gioi-thieu")).toHaveLength(0);
  });
});

describe("validateSitemapFormat", () => {
  const good = [
    "Giới thiệu | /gioi-thieu",
    "Khóa học",
    "  Lập trình web | /khoa-hoc/lap-trinh-web",
  ].join("\n");

  it("chấp nhận định dạng đúng (mục nhóm được phép không có đường dẫn)", () => {
    expect(validateSitemapFormat(good)).toHaveLength(0);
  });

  it("bắt lỗi địa chỉ tuyệt đối", () => {
    const issues = validateSitemapFormat("Giới thiệu | https://vidu.com/gioi-thieu");
    expect(issues.some((issue) => issue.message.includes("https://"))).toBe(true);
  });

  it("bắt lỗi đánh số và gạch đầu dòng", () => {
    const issues = validateSitemapFormat("1. Giới thiệu | /gioi-thieu");
    expect(issues.some((issue) => issue.message.includes("đánh số"))).toBe(true);
  });

  it("bắt lỗi thiếu đường dẫn ở đa số dòng", () => {
    const issues = validateSitemapFormat("Giới thiệu\nDịch vụ\nLiên hệ\nBlog");
    expect(issues.some((issue) => issue.message.includes("Thiếu đường dẫn"))).toBe(
      true,
    );
  });

  it("bắt lỗi thụt lề lẻ", () => {
    const issues = validateSitemapFormat(
      "Khóa học | /khoa-hoc\n   Lập trình | /khoa-hoc/lap-trinh",
    );
    expect(issues.some((issue) => issue.message.includes("thụt lề lẻ"))).toBe(true);
  });

  it("câu trả lời trống là lỗi", () => {
    expect(validateSitemapFormat("   ")).toHaveLength(1);
  });
});

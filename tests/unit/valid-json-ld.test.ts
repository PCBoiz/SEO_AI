import { describe, expect, it } from "vitest";
import { validJsonLd } from "@/domain/modules/generate-with-retry";

const HOP_LE = `<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}
</script>`;

describe("validJsonLd", () => {
  it("chấp nhận khối JSON-LD đúng", () => {
    expect(validJsonLd(HOP_LE)).toEqual([]);
  });

  it("bắt dấu phẩy thừa — kiểu hỏng KHÔNG ai thấy khi dùng thử", () => {
    // Đây là ca quan trọng nhất của cả tệp. Khối dưới dán vào <head> thì trình
    // duyệt không báo lỗi, trang vẫn hiện đúng, và toàn bộ dữ liệu có cấu trúc
    // biến mất trong im lặng.
    const loi = validJsonLd(
      `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article",}</script>`,
    );

    expect(loi).toHaveLength(1);
    expect(loi[0].message).toContain("không hợp lệ");
  });

  it("bắt rào markdown, vì nó theo chân người dùng vào <head>", () => {
    const loi = validJsonLd("```html\n" + HOP_LE + "\n```");

    expect(loi.some((i) => i.message.includes("rào mã markdown"))).toBe(true);
  });

  it("bắt khi model trả JSON trần, không bọc thẻ script", () => {
    const loi = validJsonLd('{"@context":"https://schema.org","@type":"Article"}');

    expect(loi.some((i) => i.message.includes("<script"))).toBe(true);
  });

  it("chấp nhận @graph — nhiều schema trong một khối là cách hợp lệ", () => {
    const text = `<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[{"@type":"FAQPage"},{"@type":"Article"}]}
</script>`;

    expect(validJsonLd(text)).toEqual([]);
  });

  it("chấp nhận mảng ở gốc, mỗi phần tử mang @context riêng", () => {
    const text = `<script type="application/ld+json">
[{"@context":"https://schema.org","@type":"FAQPage"},{"@context":"https://schema.org","@type":"Article"}]
</script>`;

    expect(validJsonLd(text)).toEqual([]);
  });

  it("bắt khối thiếu @type", () => {
    const loi = validJsonLd(
      `<script type="application/ld+json">{"@context":"https://schema.org","name":"x"}</script>`,
    );

    expect(loi.some((i) => i.message.includes("@type"))).toBe(true);
  });

  it("bắt khối thiếu @context", () => {
    const loi = validJsonLd(
      `<script type="application/ld+json">{"@type":"Article"}</script>`,
    );

    expect(loi.some((i) => i.message.includes("@context"))).toBe(true);
  });

  it("không đòi hỏi thêm trường nào của schema.org", () => {
    // Cố ý: kiểm sâu hơn sẽ sinh cảnh báo sai, và mỗi cảnh báo sai là một lượt
    // gọi lại model — tức là tiền thật, cho một lỗi không tồn tại.
    const toiThieu = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article"}</script>`;

    expect(validJsonLd(toiThieu)).toEqual([]);
  });
});

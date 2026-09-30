import { describe, expect, it } from "vitest";
import { boDuongDan, tuKiemXemTruoc } from "@/lib/dung-web/tu-kiem-xem-truoc";

/**
 * Phép tự kiểm bộ xem thử — thứ `/api/v1/health?kiem=xem-truoc` gọi.
 *
 * Ở đây nó chạy trên máy nên luôn phải ĐẠT; giá trị thật của nó là trên
 * Vercel, nơi tệp CSS của Tailwind chỉ có mặt nhờ `outputFileTracingIncludes`.
 */
describe("tuKiemXemTruoc", () => {
  it("đi trọn đường thật (sinh cây tệp → vẽ HTML → CSS đã biên dịch)", async () => {
    const kq = await tuKiemXemTruoc();
    expect(kq.loi ?? "").toBe("");
    expect(kq.ok).toBe(true);
    expect(kq.buoc).toBe("xong");
    // Trên máy thường dưới 1 giây kể cả lượt đầu (biên dịch Tailwind ~26 ms);
    // trần rộng để máy chậm không thành đỏ giả.
    expect(kq.mili).toBeLessThan(10_000);
  });
});

describe("boDuongDan — không để lộ đường dẫn máy chủ ra ngoài", () => {
  it("xoá đường Windows và Unix, giữ phần còn lại", () => {
    expect(boDuongDan("ENOENT: no such file, open 'D:\\Dự án\\node_modules\\tailwindcss\\index.css'")).toBe(
      "ENOENT: no such file, open '<đường dẫn>'",
    );
    expect(boDuongDan("Cannot read /var/task/node_modules/tailwindcss/index.css here")).toBe(
      "Cannot read <đường dẫn> here",
    );
    expect(boDuongDan("Lỗi không kèm đường dẫn")).toBe("Lỗi không kèm đường dẫn");
  });

  it("cắt ở 300 ký tự để câu lỗi dài không tràn ra phản hồi", () => {
    expect(boDuongDan("x".repeat(500)).length).toBe(300);
  });
});

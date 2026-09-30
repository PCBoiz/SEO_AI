import { describe, expect, it } from "vitest";
import { tuKiemAnh } from "@/lib/google/tu-kiem-anh.server";

/**
 * Bộ xử lý ảnh (`sharp`) là thư viện NHỊ PHÂN và đã từng hỏng riêng trên
 * Vercel (13/09/2026) trong khi ở máy vẫn chạy. Phép thử này giữ đường nạp ở
 * máy; giá trị thật của phép kiểm là khi gọi `/api/v1/health?kiem=anh` trên
 * chính máy chủ đang phục vụ.
 */
describe("tuKiemAnh", () => {
  it("thu được một ảnh thật ra WebP, có thu nhỏ đúng cạnh dài", async () => {
    const kq = await tuKiemAnh();
    expect(kq.loi ?? "").toBe("");
    expect(kq.ok).toBe(true);
    // Ảnh vào 4×2, xin cạnh dài 2 → ra 2×1.
    expect(kq.rong).toBe(2);
    expect(kq.cao).toBe(1);
    expect(kq.mili).toBeLessThan(10_000);
  });
});

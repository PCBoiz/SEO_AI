import { describe, expect, it } from "vitest";
import { DO_DAI_MA_CRON_TOI_THIEU, kiemMaCron } from "@/lib/lich-dang/cron";

const MA = "a".repeat(DO_DAI_MA_CRON_TOI_THIEU + 4);

describe("kiemMaCron — mã của cron Vercel", () => {
  it("chưa đặt CRON_SECRET → 'chua-bat', kể cả khi header đúng dạng", () => {
    expect(kiemMaCron(`Bearer ${MA}`, undefined)).toBe("chua-bat");
    expect(kiemMaCron(`Bearer ${MA}`, "")).toBe("chua-bat");
  });

  it("mã ngắn hơn 16 ký tự cũng coi như chưa bật — chặn '123456'", () => {
    expect(kiemMaCron("Bearer 123456", "123456")).toBe("chua-bat");
    expect(kiemMaCron("Bearer " + "x".repeat(15), "x".repeat(15))).toBe("chua-bat");
  });

  it("thiếu header, sai mã, thiếu tiền tố Bearer, hay dài lệch → 'sai'", () => {
    expect(kiemMaCron(null, MA)).toBe("sai");
    expect(kiemMaCron(undefined, MA)).toBe("sai");
    expect(kiemMaCron(`Bearer ${MA}x`, MA)).toBe("sai");
    expect(kiemMaCron(`Bearer ${MA.slice(0, -1)}b`, MA)).toBe("sai");
    expect(kiemMaCron(MA, MA)).toBe("sai");
    expect(kiemMaCron(`bearer ${MA}`, MA)).toBe("sai");
  });

  it("đúng mã, đúng dạng 'Bearer <mã>' → 'dung'", () => {
    expect(kiemMaCron(`Bearer ${MA}`, MA)).toBe("dung");
  });
});

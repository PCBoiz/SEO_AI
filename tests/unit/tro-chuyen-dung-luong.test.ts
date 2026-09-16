import { describe, expect, it } from "vitest";
import {
  cauTongDungLuong,
  congDungLuong,
  dinhDangThoiGian,
  dinhDangToken,
  dongDungLuong,
  type DungLuongTin,
} from "@/domain/tro-chuyen/dung-luong";

const tin = (p: Partial<DungLuongTin> = {}): DungLuongTin => ({
  provider: "deepseek",
  model: "deepseek-chat",
  inputTokens: 900,
  outputTokens: 350,
  durationMs: 4_300,
  ...p,
});

describe("dinhDangToken", () => {
  it("dưới 1.000 để nguyên, nghìn thì rút gọn kiểu Việt Nam (dấu phẩy)", () => {
    expect(dinhDangToken(0)).toBe("0");
    expect(dinhDangToken(820)).toBe("820");
    expect(dinhDangToken(1_250)).toBe("1,3k"); // 1,25 làm tròn lên
    expect(dinhDangToken(12_340)).toBe("12k");
    expect(dinhDangToken(1_050_000)).toBe("1,05tr");
  });

  it("số vô nghĩa không được hiện thành số đẹp", () => {
    expect(dinhDangToken(Number.NaN)).toBe("—");
    expect(dinhDangToken(-5)).toBe("—");
  });
});

describe("dinhDangThoiGian", () => {
  it("dưới một phút tính giây, trên một phút tách phút và giây", () => {
    expect(dinhDangThoiGian(800)).toBe("0,8 giây");
    expect(dinhDangThoiGian(4_300)).toBe("4,3 giây");
    expect(dinhDangThoiGian(60_000)).toBe("1 phút");
    expect(dinhDangThoiGian(72_400)).toBe("1 phút 12 giây");
  });
});

describe("dongDungLuong — dòng phụ dưới câu trả lời", () => {
  it("đủ phần thì ghép model · token · thời gian", () => {
    expect(dongDungLuong(tin(), "DeepSeek")).toBe(
      "DeepSeek · deepseek-chat · 1,3k token (vào 900 · ra 350) · 4,3 giây",
    );
  });

  it("nhà cung cấp không trả token → KHÔNG hiện '0 token'", () => {
    expect(dongDungLuong(tin({ inputTokens: null, outputTokens: null }), "Gemini")).toBe(
      "Gemini · deepseek-chat · 4,3 giây",
    );
  });

  it("chỉ có một vế token thì không bịa vế kia", () => {
    expect(dongDungLuong(tin({ inputTokens: null, durationMs: null }), "Claude")).toBe(
      "Claude · deepseek-chat · 350 token",
    );
  });

  it("không có gì để nói thì trả chuỗi rỗng, giao diện khỏi vẽ dòng trống", () => {
    expect(
      dongDungLuong({ provider: null, model: null, inputTokens: null, outputTokens: null, durationMs: null }),
    ).toBe("");
  });

  it("thiếu tên hiển thị thì dùng mã nhà cung cấp", () => {
    expect(dongDungLuong(tin({ model: null, inputTokens: null, outputTokens: null, durationMs: null }))).toBe(
      "deepseek",
    );
  });
});

describe("dữ liệu THIẾU HẲN trường (undefined, không phải null)", () => {
  it("không hiện '0 token' khi phản hồi không có trường token", () => {
    const thieu = { provider: "deepseek", model: "deepseek-chat" } as DungLuongTin;
    expect(dongDungLuong(thieu, "DeepSeek")).toBe("DeepSeek · deepseek-chat");
  });

  it("không đếm lượt đo cho tin thiếu trường", () => {
    const thieu = { provider: null, model: null } as DungLuongTin;
    expect(congDungLuong([thieu])).toEqual({ soLuotCoSo: 0, vao: 0, ra: 0, tong: 0 });
    expect(cauTongDungLuong([thieu])).toBeNull();
  });
});

describe("congDungLuong / cauTongDungLuong", () => {
  it("chỉ cộng tin CÓ số; tin thiếu số không bị coi là 0 lượt đo", () => {
    const t = congDungLuong([
      tin(),
      tin({ inputTokens: 100, outputTokens: 50 }),
      tin({ inputTokens: null, outputTokens: null }),
    ]);
    expect(t).toEqual({ soLuotCoSo: 2, vao: 1_000, ra: 400, tong: 1_400 });
  });

  it("chưa đo được lượt nào → null (không hiện '0 token')", () => {
    expect(cauTongDungLuong([])).toBeNull();
    expect(cauTongDungLuong([tin({ inputTokens: null, outputTokens: null })])).toBeNull();
  });

  it("có số thì ra một câu đọc được", () => {
    expect(cauTongDungLuong([tin(), tin({ inputTokens: 100, outputTokens: 50 })])).toBe(
      "Cuộc này đã dùng 1,4k token (vào 1,0k · ra 400) qua 2 lượt hỏi.",
    );
  });
});

import { describe, expect, it } from "vitest";
import { nenGoTuTrang, type DauVaoLuoi } from "@/domain/lich-dang/luoi-an-toan";
import type { LuotLich } from "@/domain/lich-dang/lich-dang";

// 12/09/2026 09:00 giờ VN = 02:00Z. Giờ hẹn 6:00 → đã quá giờ.
const BAY_GIO = new Date("2026-09-12T02:00:00Z");

function tt(phan: Partial<DauVaoLuoi> = {}): DauVaoLuoi {
  return {
    cauHinh: { bat: true, gioChay: 6 },
    luot: [],
    lanGoCuoi: null,
    lanGoVpsCuoi: null,
    ...phan,
  };
}

function luot(phan: Partial<LuotLich> = {}): LuotLich {
  return {
    ngay: "2026-09-12",
    lan: 0,
    chuDe: "Giá biệt thự",
    nguon: "danh-sach",
    batDauLuc: "2026-09-11T23:05:00Z",
    ...phan,
  };
}

describe("lưới an toàn — mở trang cũng là một nhịp gõ", () => {
  it("quá giờ, chưa có lượt hôm nay, chưa có crontab → bắt đầu lượt", () => {
    expect(nenGoTuTrang(tt(), BAY_GIO)).toBe("bat-dau-luot-hom-nay");
  });

  it("ĐÃ có nhịp từ VPS → không chen vào (tránh hai nguồn cùng gõ)", () => {
    expect(nenGoTuTrang(tt({ lanGoVpsCuoi: "2026-09-12T01:50:00Z" }), BAY_GIO)).toBeNull();
  });

  it("lịch tắt → không bao giờ tự gõ (nó tiêu tiền của chủ dự án)", () => {
    expect(nenGoTuTrang(tt({ cauHinh: { bat: false, gioChay: 6 } }), BAY_GIO)).toBeNull();
    expect(nenGoTuTrang(tt({ cauHinh: null }), BAY_GIO)).toBeNull();
  });

  it("chưa tới giờ hẹn → không gõ", () => {
    const som = new Date("2026-09-11T21:00:00Z"); // 04:00 VN
    expect(nenGoTuTrang(tt(), som)).toBeNull();
  });

  it("hôm nay đã có lượt (kể cả đã xong) → không gõ thêm", () => {
    expect(nenGoTuTrang(tt({ luot: [luot({ ketQua: "da-dang" })] }), BAY_GIO)).toBeNull();
    expect(nenGoTuTrang(tt({ luot: [luot({ ketQua: "dung", loi: "429" })] }), BAY_GIO)).toBeNull();
  });

  it("lượt đang dở: gõ khi đứng im ≥12 phút, không gõ khi vừa mới gõ", () => {
    const dangDo = [luot({})];
    expect(nenGoTuTrang(tt({ luot: dangDo, lanGoCuoi: "2026-09-12T01:55:00Z" }), BAY_GIO)).toBeNull();
    expect(nenGoTuTrang(tt({ luot: dangDo, lanGoCuoi: "2026-09-12T01:40:00Z" }), BAY_GIO)).toBe("cuu-luot-dung-im");
    expect(nenGoTuTrang(tt({ luot: dangDo, lanGoCuoi: null }), BAY_GIO)).toBe("cuu-luot-dung-im");
  });

  it("lượt dở của HÔM QUA vẫn được cứu — bài dở nằm đó không tự xong", () => {
    const homQua = [luot({ ngay: "2026-09-11" })];
    expect(nenGoTuTrang(tt({ luot: homQua, lanGoCuoi: "2026-09-12T01:30:00Z" }), BAY_GIO)).toBe("cuu-luot-dung-im");
  });
});

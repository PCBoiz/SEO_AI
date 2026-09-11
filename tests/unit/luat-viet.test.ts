import { describe, expect, it } from "vitest";
import { LUAT_VIET_BAI, docViPham, khoiSua, laTuChoiNoiDung } from "@/domain/lich-dang/luat-viet";
import { poolCuaLuot, type CauHinhLich } from "@/domain/lich-dang/lich-dang";

const LOI =
  "Site TỪ CHỐI vì nội dung chạm luật cấm (không phải lỗi kỹ thuật — token và đường dẫn đúng). Vi phạm:\n" +
  "[cam-ket-loi-nhuan] “cam kết sinh lời 12%/năm”\n" +
  "[danh-xung-nhat] “đẳng cấp nhất Việt Nam”\n" +
  "Sửa những câu trên rồi chạy lại.";

describe("luật viết bài — đọc lỗi từ chối của website", () => {
  it("nhận ra từ chối nội dung, rút đúng các dòng [luật] “trích”", () => {
    expect(laTuChoiNoiDung(LOI)).toBe(true);
    expect(laTuChoiNoiDung("Site từ chối (HTTP 401): token không khớp")).toBe(false);
    expect(laTuChoiNoiDung(null)).toBe(false);
    expect(docViPham(LOI)).toEqual(["[cam-ket-loi-nhuan] “cam kết sinh lời 12%/năm”", "[danh-xung-nhat] “đẳng cấp nhất Việt Nam”"]);
    expect(docViPham("không có dòng nào")).toEqual([]);
  });

  it("khối sửa nêu đúng các câu bị chạm; rỗng thì không có khối", () => {
    expect(khoiSua([])).toBe("");
    const k = khoiSua(docViPham(LOI));
    expect(k).toContain("LẦN TRƯỚC BÀI BỊ WEBSITE TỪ CHỐI");
    expect(k).toContain("- [danh-xung-nhat] “đẳng cấp nhất Việt Nam”");
  });

  it("luật phủ đủ bảy luật chặn của website (khớp cong-chan.ts bên kho site)", () => {
    for (const y of ["cam kết", "lợi nhuận", "nhất", "giá thấp nhất", "bí mật", "voucher", "số điện thoại", "Google Drive", "bịa số liệu"]) {
      expect(LUAT_VIET_BAI).toContain(y);
    }
  });

  it("pool của lượt mang luật vào audienceBrief; lượt viết lại mang thêm câu bị chạm; không quá 8000 ký tự", () => {
    const cauHinh: CauHinhLich = {
      bat: true,
      gioChay: 6,
      ai: { provider: "deepseek", model: "x" },
      chuyenMuc: "Thị trường",
      audienceBrief: "Môi giới BĐS Hạ Long.",
      location: "Hạ Long",
      language: "Tiếng Việt",
      tone: "Rõ ràng",
      chuDe: ["a b c"],
      dungSearchConsole: false,
    };
    const goc = poolCuaLuot(cauHinh, { name: "X", website: "https://x.vn" }, { chuDe: "a b c", ngay: "2026-09-12" });
    expect(goc.audienceBrief!.startsWith("Môi giới BĐS Hạ Long.")).toBe(true);
    expect(goc.audienceBrief).toContain("QUY TẮC BẮT BUỘC KHI VIẾT");
    expect(goc.audienceBrief).not.toContain("LẦN TRƯỚC");

    const sua = poolCuaLuot(cauHinh, { name: "X", website: "https://x.vn" }, { chuDe: "a b c", ngay: "2026-09-12", suaVi: docViPham(LOI) });
    expect(sua.audienceBrief).toContain("LẦN TRƯỚC BÀI BỊ WEBSITE TỪ CHỐI");
    expect(sua.audienceBrief).toContain("cam kết sinh lời 12%/năm");
    expect(sua.audienceBrief!.length).toBeLessThanOrEqual(8_000);
  });
});

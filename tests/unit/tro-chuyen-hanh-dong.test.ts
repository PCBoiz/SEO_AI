import { describe, expect, it } from "vitest";
import { docHanhDong, phamViChay, tachHanhDong } from "@/domain/tro-chuyen/hanh-dong";

const KHOI = (json: string) => "```antigravity\n" + json + "\n```";
const HOP_LE = '{"hanhDong":"dung-website","tenWebsite":"Minh Anh Land (tên giả)","moTa":"Sàn môi giới ở Hạ Long, khách xem quỹ căn rồi để lại số.","nganh":"bất động sản"}';

describe("tachHanhDong — bóc khối lệnh khỏi câu trả lời", () => {
  it("không có khối → chữ nguyên, không hành động", () => {
    const kq = tachHanhDong("Bạn nên có 4 trang.\n\n- Trang chủ\n- Bảng giá");
    expect(kq).toEqual({ chu: "Bạn nên có 4 trang.\n\n- Trang chủ\n- Bảng giá", hanhDong: null });
  });

  it("khối ở cuối → chữ bỏ khối, hành động đọc đúng, trường thừa/lạ bị bỏ", () => {
    const kq = tachHanhDong(
      "Mình sẽ dựng một website 4 trang cho sàn của bạn — đang dựng, xem bên dưới.\n\n" +
        KHOI('{"hanhDong":"dung-website","tenWebsite":"  Minh Anh Land (tên giả) ","moTa":"Sàn môi giới ở Hạ Long, khách xem quỹ căn rồi để lại số.","nganh":"bất động sản","goiY":"","mauThuongHieu":"xanh","suThat":"","laLam":1}'),
    );
    expect(kq.chu).toBe("Mình sẽ dựng một website 4 trang cho sàn của bạn — đang dựng, xem bên dưới.");
    expect(kq.hanhDong).toEqual({
      hanhDong: "dung-website",
      tenWebsite: "Minh Anh Land (tên giả)",
      moTa: "Sàn môi giới ở Hạ Long, khách xem quỹ căn rồi để lại số.",
      nganh: "bất động sản",
      goiY: undefined,
      // "xanh" không phải mã màu → bỏ, không để chuỗi lạ chảy vào bước thiết kế.
      mauThuongHieu: undefined,
      suThat: undefined,
      yeuCauSua: undefined,
      phamVi: undefined,
    });
    expect(kq.loi).toBeUndefined();
  });

  it("nhiều khối → lấy khối cuối, bỏ hết khỏi chữ; CRLF cũng đọc được", () => {
    const kq = tachHanhDong(
      "Nháp:\r\n" + KHOI('{"hanhDong":"dung-website","tenWebsite":"A","moTa":"mô tả đủ mười ký tự"}').replace(/\n/g, "\r\n") + "\r\nSửa lại:\r\n" + KHOI(HOP_LE).replace(/\n/g, "\r\n"),
    );
    expect(kq.hanhDong?.tenWebsite).toBe("Minh Anh Land (tên giả)");
    expect(kq.chu).not.toContain("```");
    expect(kq.chu).toContain("Nháp:");
  });

  it("khối hỏng (JSON sai / thiếu mô tả / sai hành động) → không hành động, có câu lỗi để nói với người dùng", () => {
    for (const than of ["{không phải json", '{"hanhDong":"dung-website","tenWebsite":"A"}', '{"hanhDong":"xoa-du-an","tenWebsite":"A","moTa":"mô tả đủ mười ký tự"}']) {
      const kq = tachHanhDong("Đang dựng…\n" + KHOI(than));
      expect(kq.hanhDong).toBeNull();
      expect(kq.loi).toContain("không đọc được");
      expect(kq.chu).toBe("Đang dựng…");
    }
  });

  it("docHanhDong cắt theo giới hạn và giữ mã màu hợp lệ", () => {
    const h = docHanhDong(
      JSON.stringify({ hanhDong: "dung-website", tenWebsite: "x".repeat(300), moTa: "mô tả đủ mười ký tự", mauThuongHieu: "#1a6b4a", phamVi: "chu", yeuCauSua: "Đổi giọng thân thiện hơn" }),
    );
    expect(h?.tenWebsite.length).toBe(100);
    expect(h?.mauThuongHieu).toBe("#1a6b4a");
    expect(h?.phamVi).toBe("chu");
    expect(h?.yeuCauSua).toBe("Đổi giọng thân thiện hơn");
  });
});

describe("phamViChay — suy phạm vi khi model không ghi", () => {
  const goc = docHanhDong(HOP_LE)!;
  it("chưa có bản dựng → luôn tất cả, kể cả model đòi chỉ sửa chữ", () => {
    expect(phamViChay(goc, false)).toBe("tat-ca");
    expect(phamViChay({ ...goc, phamVi: "chu", yeuCauSua: "ngắn hơn" }, false)).toBe("tat-ca");
  });
  it("đã có bản dựng + có yêu cầu sửa, model không ghi → chỉ chữ", () => {
    expect(phamViChay({ ...goc, yeuCauSua: "ngắn hơn" }, true)).toBe("chu");
    expect(phamViChay(goc, true)).toBe("tat-ca");
    expect(phamViChay({ ...goc, phamVi: "tat-ca", yeuCauSua: "thêm trang bảng hàng" }, true)).toBe("tat-ca");
  });
});

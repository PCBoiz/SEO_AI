import { describe, expect, it } from "vitest";
import {
  chonProperty,
  congDong,
  demChu,
  laDuoiDai,
  khoangSoSanh,
  thayDoiPhanTram,
} from "@/domain/seo/search-console";

describe("congDong", () => {
  it("tính vị trí trung bình theo TRỌNG SỐ hiển thị, không phải trung bình cộng", () => {
    // Đây là ca làm lộ lỗi. Trung bình cộng của 1 và 90 là 45,5 — nghe hợp lý
    // nên không ai nghi. Nhưng 999 trong 1000 lượt hiển thị nằm ở vị trí 90,
    // nên vị trí thật của cụm này phải gần 90.
    const tong = congDong([
      { clicks: 1, impressions: 1, ctr: 1, position: 1 },
      { clicks: 0, impressions: 999, ctr: 0, position: 90 },
    ]);

    expect(tong.viTri).toBeCloseTo(89.911, 3);
    expect(tong.viTri).not.toBeCloseTo(45.5, 1);
  });

  it("tính CTR trên tổng, không lấy trung bình các CTR", () => {
    // Trung bình hai CTR (100% và 0%) ra 50%. CTR thật là 1/1000 = 0,1%.
    const tong = congDong([
      { clicks: 1, impressions: 1, ctr: 1, position: 1 },
      { clicks: 0, impressions: 999, ctr: 0, position: 90 },
    ]);

    expect(tong.ctr).toBeCloseTo(0.001, 5);
  });

  it("không chia cho 0 khi chưa có lượt hiển thị nào", () => {
    const tong = congDong([]);

    expect(tong).toEqual({ clicks: 0, impressions: 0, ctr: 0, viTri: null });
  });
});

describe("chonProperty", () => {
  it("ưu tiên sc-domain vì bản tiền tố thiếu dữ liệu của www", () => {
    const chon = chonProperty("https://halongxanh360.vn", [
      "https://halongxanh360.vn/",
      "sc-domain:halongxanh360.vn",
    ]);

    expect(chon).toBe("sc-domain:halongxanh360.vn");
  });

  it("khớp theo host khi chỉ có bản tiền tố", () => {
    const chon = chonProperty("https://halongxanh360.vn/tin-tuc", [
      "https://vidu.com/",
      "https://halongxanh360.vn/",
    ]);

    expect(chon).toBe("https://halongxanh360.vn/");
  });

  it("khớp được cả khi website ghi thiếu giao thức", () => {
    const chon = chonProperty("halongxanh360.vn", ["sc-domain:halongxanh360.vn"]);

    expect(chon).toBe("sc-domain:halongxanh360.vn");
  });

  it("trả null khi không property nào thuộc tên miền đó", () => {
    // Thà không có số còn hơn có số của trang KHÁC. Chọn bừa property đầu danh
    // sách là cách âm thầm nhất để hiện số liệu của một website khác lên đây.
    const chon = chonProperty("https://halongxanh360.vn", [
      "sc-domain:trangkhac.vn",
      "https://vidu.com/",
    ]);

    expect(chon).toBeNull();
  });
});

describe("khoangSoSanh", () => {
  it("lùi 3 ngày vì Search Console chưa có dữ liệu của hôm nay", () => {
    const { kyNay } = khoangSoSanh(new Date("2026-09-10T00:00:00Z"));

    expect(kyNay.ketThuc).toBe("2026-09-07");
    expect(kyNay.batDau).toBe("2026-08-11");
  });

  it("kỳ trước liền kề kỳ này, không chồng lấn một ngày nào", () => {
    const { kyNay, kyTruoc } = khoangSoSanh(new Date("2026-09-10T00:00:00Z"));

    expect(kyTruoc.ketThuc).toBe("2026-08-10");
    expect(new Date(kyTruoc.ketThuc).getTime()).toBeLessThan(
      new Date(kyNay.batDau).getTime(),
    );
    // 28 ngày mỗi kỳ, tính cả hai đầu.
    const soNgay =
      (new Date(kyTruoc.ketThuc).getTime() - new Date(kyTruoc.batDau).getTime()) /
        86_400_000 +
      1;
    expect(soNgay).toBe(28);
  });
});

describe("thayDoiPhanTram", () => {
  it("không bịa ra phần trăm khi kỳ trước bằng 0", () => {
    expect(thayDoiPhanTram(0, 12)).toBeNull();
    expect(thayDoiPhanTram(0, 0)).toBe(0);
  });

  it("tính đúng chiều giảm", () => {
    expect(thayDoiPhanTram(200, 150)).toBeCloseTo(-25);
  });
});

describe("laDuoiDai", () => {
  it("nhận truy vấn dạng câu hỏi dài — nhóm đáng viết bài nhất", () => {
    // Nghiên cứu vòng 7: truy vấn ≥7 chữ kích hoạt AI Overviews 46,4% số lần,
    // so với truy vấn 1 chữ chỉ 9,5%.
    expect(laDuoiDai("thủ tục sang tên sổ đỏ đất nền hạ long mất bao lâu")).toBe(
      true,
    );
  });

  it("không nhận truy vấn ngắn", () => {
    expect(laDuoiDai("hạ long xanh")).toBe(false);
    expect(laDuoiDai("giá")).toBe(false);
  });

  it("đúng ở ranh giới 7 chữ", () => {
    expect(demChu("mua nhà hạ long xanh giá bao")).toBe(7);
    expect(laDuoiDai("mua nhà hạ long xanh giá bao")).toBe(true);
    expect(laDuoiDai("mua nhà hạ long xanh giá")).toBe(false);
  });

  it("không đếm khoảng trắng thừa thành chữ", () => {
    // Truy vấn từ Search Console đôi khi mang khoảng trắng kép. Đếm bừa thì một
    // truy vấn 5 chữ bị gắn nhãn "đuôi dài" và lọt vào danh sách nên-viết-bài.
    expect(demChu("  hạ   long    xanh  ")).toBe(3);
    expect(laDuoiDai("  hạ   long    xanh  ")).toBe(false);
  });

  it("chuỗi rỗng không phải đuôi dài", () => {
    expect(demChu("")).toBe(0);
    expect(laDuoiDai("")).toBe(false);
  });
});

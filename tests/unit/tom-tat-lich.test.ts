import { describe, expect, it } from "vitest";
import { tomTatLich, duongDuyet, type DauVaoTomTat } from "@/domain/lich-dang/tom-tat";
import { BUOC_LICH_DANG, type BuocTienDo, type LuotLich } from "@/domain/lich-dang/lich-dang";

// 12/09/2026 09:00 giờ VN = 02:00Z.
const BAY_GIO = new Date("2026-09-12T02:00:00Z");

function coSo(phan: Partial<DauVaoTomTat> = {}): DauVaoTomTat {
  return {
    daLap: true,
    cauHinh: { bat: true, gioChay: 6 },
    luot: [],
    dangDo: null,
    lanGoCuoi: "2026-09-12T01:55:00Z",
    lanGoVpsCuoi: "2026-09-12T01:55:00Z",
    ...phan,
  };
}

function luot(phan: Partial<LuotLich>): LuotLich {
  return { ngay: "2026-09-12", lan: 0, chuDe: "Giá biệt thự", nguon: "danh-sach", batDauLuc: "2026-09-11T23:05:00Z", ...phan };
}

function cacBuoc(xong: number, them?: Partial<BuocTienDo>): BuocTienDo[] {
  return BUOC_LICH_DANG.map((moduleKey, i) => ({
    moduleKey,
    trangThai: i < xong ? "xong" : i === xong ? "dang-chay" : "chua-chay",
    lan: 0,
    ...(i === xong ? them : {}),
  }));
}

describe("tomTatLich — một câu cho người không rành kỹ thuật", () => {
  it("chưa lập / đang tắt", () => {
    expect(tomTatLich(coSo({ daLap: false, cauHinh: null }), BAY_GIO).muc).toBe("chua-lap");
    expect(tomTatLich(coSo({ cauHinh: { bat: false, gioChay: 6 } }), BAY_GIO).muc).toBe("tat");
  });

  it("đang viết: nói bước mấy trên mấy", () => {
    const tt = coSo({ dangDo: { luot: luot({}), cacBuoc: cacBuoc(4) } });
    const kq = tomTatLich(tt, BAY_GIO);
    expect(kq.muc).toBe("dang-chay");
    expect(kq.cau).toContain("bước 5/9");
    expect(kq.cau).toContain("Giá biệt thự");
  });

  it("đang viết nhưng đứng im ≥12 phút → cần xem, bảo bấm Gõ tiếp ngay", () => {
    const tt = coSo({ dangDo: { luot: luot({}), cacBuoc: cacBuoc(4) }, lanGoCuoi: "2026-09-12T01:40:00Z" });
    const kq = tomTatLich(tt, BAY_GIO);
    expect(kq.muc).toBe("can-xem");
    expect(kq.cau).toContain("đứng im 20 phút");
    expect(kq.viecCanLam).toContain("Gõ tiếp ngay");
  });

  it("bước hỏng đã thử lại một lần → cần xem", () => {
    const tt = coSo({ dangDo: { luot: luot({}), cacBuoc: cacBuoc(4, { trangThai: "hong", lan: 1, loi: "429" }) } });
    expect(tomTatLich(tt, BAY_GIO).muc).toBe("can-xem");
  });

  it("bài hôm nay chờ duyệt → link mở hàng chờ duyệt, KHÔNG mở bài (404 khi chưa duyệt)", () => {
    const tt = coSo({ luot: [luot({ ketQua: "da-dang", postUrl: "https://halongxanh360.vn/tin-tuc/gia-biet-thu" })] });
    const kq = tomTatLich(tt, BAY_GIO);
    expect(kq.muc).toBe("cho-duyet");
    expect(kq.duyetUrl).toBe("https://halongxanh360.vn/duyet-bai");
    expect(kq.viecCanLam).toContain("duyệt");
  });

  it("lượt hôm nay dừng → cần xem, kèm lý do", () => {
    const tt = coSo({ luot: [luot({ ketQua: "dung", loi: "hết chủ đề" })] });
    const kq = tomTatLich(tt, BAY_GIO);
    expect(kq.muc).toBe("can-xem");
    expect(kq.cau).toContain("hết chủ đề");
  });

  it("chạy lại trong ngày: lấy lần mới nhất (lan lớn nhất)", () => {
    const tt = coSo({
      luot: [luot({ lan: 1, ketQua: "da-dang", postUrl: "https://x.vn/tin-tuc/a" }), luot({ lan: 0, ketQua: "dung", loi: "429" })],
    });
    expect(tomTatLich(tt, BAY_GIO).muc).toBe("cho-duyet");
  });

  it("chưa tới giờ → bình thường, nhắc bài gần nhất nếu có", () => {
    const som = new Date("2026-09-11T21:00:00Z"); // 04:00 VN
    const tt = coSo({ luot: [luot({ ngay: "2026-09-11", ketQua: "da-dang", postUrl: "https://x.vn/tin-tuc/a" })] });
    const kq = tomTatLich(tt, som);
    expect(kq.muc).toBe("on");
    expect(kq.cau).toContain("6:00");
    expect(kq.cau).toContain("2026-09-11");
    expect(kq.duyetUrl).toBe("https://x.vn/duyet-bai");
  });

  it("quá giờ, VPS chưa gõ lần nào → cần xem, nói rõ là việc kỹ thuật làm một lần", () => {
    const kq = tomTatLich(coSo({ lanGoVpsCuoi: null, lanGoCuoi: null }), BAY_GIO);
    expect(kq.muc).toBe("can-xem");
    expect(kq.viecCanLam).toContain("kỹ thuật");
  });

  it("quá giờ ≥1 tiếng, VPS có gõ mà không có bài → cần xem", () => {
    const kq = tomTatLich(coSo(), BAY_GIO);
    expect(kq.muc).toBe("can-xem");
    expect(kq.cau).toContain("quá giờ hẹn");
  });

  it("đang trong giờ hẹn (chưa qua 1 tiếng) → bình thường", () => {
    const kq = tomTatLich(coSo({ cauHinh: { bat: true, gioChay: 9 } }), BAY_GIO);
    expect(kq.muc).toBe("on");
  });

  it("duongDuyet: gốc website + /duyet-bai; địa chỉ hỏng thì trả nguyên", () => {
    expect(duongDuyet("https://a.vn/tin-tuc/x?y=1")).toBe("https://a.vn/duyet-bai");
    expect(duongDuyet("không phải url")).toBe("không phải url");
  });
});

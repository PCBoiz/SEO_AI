import { describe, expect, it } from "vitest";
import { mauDocDuoc, tronMau } from "@/domain/dung-web/mau-an-toan";
import { heThietKeSchema, kiemHeThietKe, tuongPhan } from "@/domain/dung-web/he-thiet-ke";
import { dungCayTep } from "@/domain/dung-web/dung-cay-tep";
import { kienTrucSchema } from "@/domain/dung-web/kien-truc";

const TOI = { nen: "#0b1f1a", chu: "#f4f1ea", nhan: "#2fb583", phu: "#9fb5ad" };
/** Nền sáng cố ý yếu: chữ phụ ~2,9:1, màu nhấn xanh tươi ~2,5:1 trên nền. */
const SANG_YEU = { nen: "#fbf9f4", chu: "#1c2420", nhan: "#2fb583", phu: "#8a948f" };

function thietKe(mau: typeof TOI) {
  return {
    mau,
    font: { tieuDe: "Fraunces", than: "Be Vietnam Pro" },
    khoangCach: "vua",
    goc: "bo-nhe",
    giong: ["rõ ràng", "điềm đạm"],
    lyDo: "x",
  };
}

describe("màu đọc được", () => {
  it("bản đã đạt thì giữ nguyên từng màu — không đổi thiết kế người ta đã chọn", () => {
    expect(mauDocDuoc({ mau: TOI })).toEqual({
      chu: "#f4f1ea",
      phu: "#9fb5ad",
      nhanChu: "#2fb583",
      chuTrenNhan: "#0b1f1a",
      canh: "#d8845c",
    });
  });

  it("nền sáng yếu: chữ phụ, màu nhấn làm chữ, chữ trên nút, màu cảnh báo đều được chỉnh tới ≥ 4,5:1", () => {
    const m = mauDocDuoc({ mau: SANG_YEU });
    const nenNhe = tronMau(SANG_YEU.nen, SANG_YEU.chu, 0.05);
    for (const [ten, mau] of Object.entries({ chu: m.chu, phu: m.phu, nhanChu: m.nhanChu, canh: m.canh })) {
      expect(tuongPhan(mau, SANG_YEU.nen), `${ten} trên nền`).toBeGreaterThanOrEqual(4.5);
      expect(tuongPhan(mau, nenNhe), `${ten} trên nền nhạt`).toBeGreaterThanOrEqual(4.5);
    }
    expect(tuongPhan(m.chuTrenNhan, SANG_YEU.nhan)).toBeGreaterThanOrEqual(4.5);
    // Màu nào đã đạt thì giữ; màu chưa đạt thì đổi.
    expect(m.chu).toBe(SANG_YEU.chu);
    expect(m.chuTrenNhan).toBe(SANG_YEU.chu);
    expect(m.phu).not.toBe(SANG_YEU.phu);
    expect(m.nhanChu).not.toBe(SANG_YEU.nhan);
    expect(m.canh).not.toBe("#d8845c");
  });

  it("chỉnh vừa đủ, không nhảy thẳng về màu chữ: chữ phụ vẫn khác màu chữ chính", () => {
    const m = mauDocDuoc({ mau: SANG_YEU });
    expect(m.phu).not.toBe(m.chu);
    expect(tuongPhan(m.phu, SANG_YEU.nen)).toBeLessThan(tuongPhan(SANG_YEU.chu, SANG_YEU.nen));
  });

  it("chữ chính yếu (hợp đồng không qua bước kiểm) cũng được kéo về đủ đọc", () => {
    const m = mauDocDuoc({ mau: { nen: "#ffffff", chu: "#bbbbbb", nhan: "#1f6f53", phu: "#cccccc" } });
    expect(tuongPhan(m.chu, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(tuongPhan(m.phu, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("bước Hệ thiết kế bắt chữ phụ yếu để model chọn lại", () => {
    const loi = kiemHeThietKe(JSON.stringify(thietKe(SANG_YEU))).map((l) => l.message);
    expect(loi.some((m) => m.includes("chữ phụ"))).toBe(true);
    expect(kiemHeThietKe(JSON.stringify(thietKe(TOI)))).toEqual([]);
  });

  it("globals.css dùng màu đã chỉnh: --chu-tren-nhan cho nút chính, --nhan-chu cho chữ màu nhấn", () => {
    const kt = kienTrucSchema.parse({
      tenWebsite: "Minh Anh Land",
      nganh: "chung",
      khoiChung: ["site-header", "site-footer"],
      trang: [{ duong: "/", tieuDe: "Trang chủ", mucDich: "x", khoi: [{ ma: "hero-anh", noiDung: "a" }, { ma: "khoi-chot", noiDung: "b" }] }],
      canVietMoi: [],
      duLieuCan: [],
    });
    const cay = dungCayTep(kt, heThietKeSchema.parse(thietKe(SANG_YEU)), { dienThoai: "0912 345 678" }).cay;
    const css = cay.tep.find((t) => t.duongDan === "src/app/globals.css")!.noiDung as string;
    const m = mauDocDuoc({ mau: SANG_YEU });
    expect(css).toContain(`--phu: ${m.phu};`);
    expect(css).toContain(`--chu-tren-nhan: ${m.chuTrenNhan};`);
    expect(css).toContain(`--nhan-chu: ${m.nhanChu};`);
    expect(css).toContain(`--canh: ${m.canh};`);
    expect(css).toContain(".nut-chinh { background: var(--nhan); color: var(--chu-tren-nhan); }");
    expect(css).toContain(".chu-nhan { color: var(--nhan-chu); }");
  });
});

import { describe, expect, it } from "vitest";
import { THIET_KE_MAC_DINH, docHopDongTuDauRa } from "@/domain/dung-web/tu-dau-ra";

const KIEN_TRUC = {
  tenWebsite: "Nha khoa Bình Minh",
  nganh: "chung",
  khoiChung: ["site-header"],
  trang: [
    {
      duong: "/",
      tieuDe: "Trang chủ",
      mucDich: "Khách gọi ngay.",
      khoi: [
        { ma: "hero-anh", noiDung: "Câu lớn." },
        { ma: "khoi-chot", noiDung: "Chốt." },
      ],
    },
  ],
  canVietMoi: [],
  duLieuCan: [],
};

const THIET_KE = {
  mau: { nen: "#0b1f1a", chu: "#f4f1ea", nhan: "#2fb583", phu: "#9fb5ad" },
  font: { tieuDe: "Fraunces", than: "Be Vietnam Pro" },
  khoangCach: "thoang",
  goc: "vuong",
  giong: ["điềm đạm", "rõ ràng"],
  lyDo: "x",
};

/** Đầu ra job đã làm phẳng: chữ tiếng Việt lẫn khối ```json — đúng như thật. */
function lamPhang(khoi: unknown, tieuDe = "JSON"): string {
  return `## Kiến trúc\nMột đoạn chữ người đọc.\n\n## ${tieuDe}\n\`\`\`json\n${JSON.stringify(khoi)}\n\`\`\`\n\n## Ghi chú\n2 trang.`;
}

describe("docHopDongTuDauRa", () => {
  it("chưa có kiến trúc → null (chưa có gì để dựng)", () => {
    expect(docHopDongTuDauRa(new Map())).toBeNull();
    expect(docHopDongTuDauRa(new Map([["RIS_WEB_KIEN_TRUC", "chữ không có JSON"]]))).toBeNull();
  });

  it("moi thứ đủ → hợp đồng đầy đủ, không báo thiếu", () => {
    const kq = docHopDongTuDauRa(
      new Map([
        ["RIS_WEB_KIEN_TRUC", lamPhang(KIEN_TRUC)],
        ["RIS_WEB_THIET_KE", lamPhang(THIET_KE)],
        ["RIS_WEB_VIET_CHU", lamPhang({ "/#0": { tieuDe: "Khám trong ngày" } })],
      ]),
    )!;
    expect(kq.kienTruc.tenWebsite).toBe("Nha khoa Bình Minh");
    expect(kq.thietKe.mau.nhan).toBe("#2fb583");
    expect(kq.chu["/#0"]).toEqual({ tieuDe: "Khám trong ngày" });
    expect(kq.thieu).toEqual([]);
  });

  it("thiếu hệ thiết kế → dùng bộ phòng hờ và NÓI RA", () => {
    const kq = docHopDongTuDauRa(new Map([["RIS_WEB_KIEN_TRUC", lamPhang(KIEN_TRUC)]]))!;
    expect(kq.thietKe).toEqual(THIET_KE_MAC_DINH);
    expect(kq.thieu.join(" ")).toContain("Hệ thiết kế");
    expect(kq.thieu.join(" ")).toContain("Viết chữ");
  });

  it("khoá chữ sai khuôn bị bỏ — đừng để chữ rơi vào hư không mà không ai biết", () => {
    const kq = docHopDongTuDauRa(
      new Map([
        ["RIS_WEB_KIEN_TRUC", lamPhang(KIEN_TRUC)],
        [
          "RIS_WEB_VIET_CHU",
          lamPhang({
            "/#0": { tieuDe: "Đúng khuôn" },
            "trang-chu": { tieuDe: "Sai khuôn — không có #" },
            "/#x": { tieuDe: "Sai khuôn — không phải số" },
            "/bang-gia#2": { dan: "Đúng khuôn" },
          }),
        ],
      ]),
    )!;
    expect(Object.keys(kq.chu).sort()).toEqual(["/#0", "/bang-gia#2"]);
  });

  it("hệ thiết kế hỏng (màu không phải hex) thì rơi về bản phòng hờ chứ không nổ", () => {
    const kq = docHopDongTuDauRa(
      new Map([
        ["RIS_WEB_KIEN_TRUC", lamPhang(KIEN_TRUC)],
        ["RIS_WEB_THIET_KE", lamPhang({ ...THIET_KE, mau: { ...THIET_KE.mau, nen: "xanh rêu" } })],
      ]),
    )!;
    expect(kq.thietKe).toEqual(THIET_KE_MAC_DINH);
  });
});

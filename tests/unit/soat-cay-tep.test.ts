import { describe, expect, it } from "vitest";
import { soatCayTep, tomTatSoat } from "@/domain/dung-web/soat-cay-tep";
import { dungCayTep } from "@/domain/dung-web/dung-cay-tep";
import { kienTrucSchema } from "@/domain/dung-web/kien-truc";
import { heThietKeSchema } from "@/domain/dung-web/he-thiet-ke";
import type { CayTep } from "@/domain/dung-web/moi-truong-dung";

const THIET_KE = heThietKeSchema.parse({
  mau: { nen: "#0b1f1a", chu: "#f4f1ea", nhan: "#2fb583", phu: "#9fb5ad" },
  font: { tieuDe: "Fraunces", than: "Be Vietnam Pro" },
  khoangCach: "vua",
  goc: "bo-nhe",
  giong: ["rõ ràng", "điềm đạm"],
  lyDo: "x",
});

const KIEN_TRUC = kienTrucSchema.parse({
  tenWebsite: "Nha khoa Bình Minh",
  nganh: "chung",
  khoiChung: ["site-header", "site-footer", "du-lieu-co-cau-truc"],
  trang: [
    {
      duong: "/",
      tieuDe: "Trang chủ",
      mucDich: "Khách gọi ngay.",
      khoi: [
        { ma: "hero-anh", noiDung: "Câu lớn." },
        { ma: "cau-hoi-thuong-gap", noiDung: "Hỏi đáp." },
      ],
    },
    {
      duong: "/bang-gia",
      tieuDe: "Bảng giá",
      mucDich: "Xem giá thật.",
      khoi: [
        { ma: "gia-thuc-tra", noiDung: "Bảng giá." },
        { ma: "khoi-chot", noiDung: "Chốt." },
      ],
    },
  ],
  canVietMoi: [],
  duLieuCan: [],
});

function cayThat(dienThoai = "0912 345 678"): CayTep {
  return dungCayTep(KIEN_TRUC, THIET_KE, { dienThoai }, {}, [
    { ten: "mat-tien.webp", alt: "Mặt tiền", bytes: Buffer.from([1, 2, 3]) },
  ]).cay;
}

/** Đổi nội dung một tệp trong cây để dựng ra đúng một lỗi. */
function sua(cay: CayTep, duongDan: string, doi: (van: string) => string): CayTep {
  return {
    ...cay,
    tep: cay.tep.map((t) =>
      t.duongDan === duongDan && typeof t.noiDung === "string" ? { ...t, noiDung: doi(t.noiDung) } : t,
    ),
  };
}

describe("soát cây tệp trước khi giao", () => {
  it("cây do bộ sinh mã dựng ra thì sạch", () => {
    expect(soatCayTep(cayThat())).toEqual([]);
    expect(tomTatSoat([])).toContain("không có lỗi");
  });

  it("bắt trang thiếu h1 và trang có hai h1", () => {
    const thieu = sua(cayThat(), "src/components/khoi/hero-anh.tsx", (v) => v.replace("<h1", "<p").replace("</h1>", "</p>"));
    expect(soatCayTep(thieu).some((l) => l.tep === "src/app/page.tsx" && l.loi.includes("0 thẻ <h1>"))).toBe(true);

    const hai = sua(cayThat(), "src/app/page.tsx", (v) => v.replace("<>", "<>\n      <h1>Thừa</h1>"));
    expect(soatCayTep(hai).some((l) => l.loi.includes("2 thẻ <h1>"))).toBe(true);
  });

  it("bắt ảnh thiếu alt và alt rỗng", () => {
    const thieu = sua(cayThat(), "src/components/khoi/hero-anh.tsx", (v) => v.replace(/alt=".*?"/, ""));
    expect(soatCayTep(thieu).some((l) => l.loi.includes("thiếu alt"))).toBe(true);

    const rong = sua(cayThat(), "src/components/khoi/hero-anh.tsx", (v) => v.replace(/alt=".*?"/, 'alt=""'));
    expect(soatCayTep(rong).some((l) => l.loi.includes("alt rỗng"))).toBe(true);
  });

  it("bắt chữ undefined lọt vào nội dung", () => {
    const xau = sua(cayThat(), "src/components/khoi/khoi-chot.tsx", (v) => v.replace(/\{"[^"]*"\}/, '{"undefined"}'));
    expect(soatCayTep(xau).some((l) => l.loi.includes("undefined"))).toBe(true);
  });

  it("bắt liên kết trống href=\"#\"", () => {
    const xau = sua(cayThat(), "src/components/khoi/hero-anh.tsx", (v) => v.replace('href="#lien-he"', 'href="#"'));
    expect(soatCayTep(xau).some((l) => l.loi.includes("liên kết trống"))).toBe(true);
  });

  it("bắt JSON-LD hỏng", () => {
    const xau = sua(cayThat(), "src/components/khoi/du-lieu-co-cau-truc.tsx", (v) =>
      v.replace(/__html: "(?:[^"\\]|\\.)*"/, '__html: "{hỏng"'),
    );
    expect(soatCayTep(xau).some((l) => l.loi.includes("JSON-LD"))).toBe(true);
  });

  it("bắt số điện thoại giữ chỗ còn sót", () => {
    expect(soatCayTep(cayThat("0000 000 000")).some((l) => l.loi.includes("giữ chỗ"))).toBe(true);
  });

  it("bắt thiếu tệp bắt buộc và thiếu biến thiết kế", () => {
    const cay = cayThat();
    const thieuTep: CayTep = { ...cay, tep: cay.tep.filter((t) => t.duongDan !== "next-env.d.ts") };
    expect(soatCayTep(thieuTep).some((l) => l.tep === "next-env.d.ts")).toBe(true);

    const thieuBien = sua(cay, "src/app/globals.css", (v) => v.replace("--nhan:", "--khong-dung:"));
    expect(soatCayTep(thieuBien).some((l) => l.loi.includes("--nhan"))).toBe(true);
  });

  it("tóm tắt đếm đúng lỗi nặng và lỗi nhẹ", () => {
    const van = tomTatSoat([
      { tep: "a", loi: "x", muc: "nang" },
      { tep: "b", loi: "y", muc: "nhe" },
    ]);
    expect(van).toContain("1 lỗi nặng, 1 lỗi nhẹ");
    expect(van).toContain("✗ a: x");
  });
});

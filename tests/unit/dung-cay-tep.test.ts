import { describe, expect, it } from "vitest";
import { dungCayTep, lamSlug } from "@/domain/dung-web/dung-cay-tep";
import { kienTrucSchema, type KienTrucWeb } from "@/domain/dung-web/kien-truc";
import { heThietKeSchema, type HeThietKe } from "@/domain/dung-web/he-thiet-ke";
import { MAU_KHOI, timMauKhoi } from "@/domain/dung-web/khoi/mau-khoi";
import { DANH_MUC_THANH_PHAN } from "@/domain/dung-web/danh-muc-thanh-phan";

const THIET_KE: HeThietKe = heThietKeSchema.parse({
  mau: { nen: "#0b1f1a", chu: "#f4f1ea", nhan: "#2fb583", phu: "#9fb5ad" },
  font: { tieuDe: "Fraunces", than: "Be Vietnam Pro" },
  khoangCach: "vua",
  goc: "bo-nhe",
  giong: ["điềm đạm", "rõ ràng"],
  lyDo: "Nền tối chữ sáng đỡ chói khi xem buổi tối.",
});

function kienTruc(sua: Partial<KienTrucWeb> = {}): KienTrucWeb {
  return kienTrucSchema.parse({
    tenWebsite: "Nha khoa Bình Minh",
    nganh: "chung",
    khoiChung: ["site-header", "site-footer", "lien-he-noi"],
    trang: [
      {
        duong: "/",
        tieuDe: "Trang chủ",
        mucDich: "Khách gọi ngay trong đêm.",
        khoi: [
          { ma: "hero-anh", noiDung: "Câu lớn: khám trong ngày." },
          { ma: "gia-thuc-tra", noiDung: "Giá từng dịch vụ." },
        ],
      },
      {
        duong: "/bang-gia",
        tieuDe: "Bảng giá",
        mucDich: "Xem giá thật trước khi tới.",
        khoi: [
          { ma: "gia-thuc-tra", noiDung: "Bảng giá đầy đủ." },
          { ma: "khoi-chot", noiDung: "Chốt: gọi để tư vấn." },
        ],
      },
    ],
    canVietMoi: [],
    duLieuCan: [],
    ...sua,
  });
}

const THONG_TIN = { dienThoai: "0900 000 000", zalo: "https://zalo.me/0900000000", diaChi: "https://binhminh.vn" };

function dung(kt = kienTruc(), noiDung = {}, anh: Array<{ ten: string; alt: string; bytes: Buffer }> = []) {
  const kq = dungCayTep(kt, THIET_KE, THONG_TIN, noiDung, anh);
  const theoDuong = new Map(kq.cay.tep.map((t) => [t.duongDan, t.noiDung]));
  return {
    ...kq,
    theoDuong,
    /** Nội dung dạng chữ; tệp nhị phân trả chuỗi rỗng. */
    doc: (d: string) => {
      const v = theoDuong.get(d);
      return typeof v === "string" ? v : "";
    },
  };
}

describe("dungCayTep — cây tệp Next.js dựng được", () => {
  it("đủ tệp cấu hình, và mọi đường dẫn đều nằm trong dự án", () => {
    const { danhSachTep } = dung();
    for (const can of ["package.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs", "next-env.d.ts", "src/app/layout.tsx", "src/app/globals.css", "src/app/sitemap.ts", "src/app/robots.ts", "src/app/api/lien-he/route.ts", "README.md"]) {
      expect(danhSachTep, can).toContain(can);
    }
    for (const d of danhSachTep) {
      expect(d.startsWith("/"), d).toBe(false);
      expect(d.includes("\\"), d).toBe(false);
      expect(d.split("/").includes(".."), d).toBe(false);
    }
    expect(new Set(danhSachTep).size).toBe(danhSachTep.length);
  });

  it("package.json đóng cứng phiên bản, không dùng dấu ^", () => {
    const goi = JSON.parse(dung().doc("package.json")) as {
      name: string;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(goi.name).toBe("nha-khoa-binh-minh");
    for (const [ten, ban] of Object.entries({ ...goi.dependencies, ...goi.devDependencies })) {
      expect(ban, ten).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("mỗi trang một tệp; trang chủ ở src/app/page.tsx", () => {
    const { danhSachTep } = dung();
    expect(danhSachTep).toContain("src/app/page.tsx");
    expect(danhSachTep).toContain("src/app/bang-gia/page.tsx");
  });

  it("trang KHÔNG có khối mở đầu thì được thêm h1 — và chữ đi qua dấu ngoặc nhọn, không lộ dấu nháy", () => {
    const { doc } = dung();
    const bangGia = doc("src/app/bang-gia/page.tsx");
    expect(bangGia).toContain('<h1 className="tieu-de text-4xl leading-tight md:text-5xl">{"Bảng giá"}</h1>');
    // Lỗi thật 12/09: dùng JSON.stringify thẳng vào JSX làm trang hiện ra
    // nguyên dấu nháy: "Bảng giá". Chốt lại bằng phép thử này.
    expect(bangGia).not.toContain('>"Bảng giá"<');
    // Trang có khối mở đầu thì h1 nằm trong khối, trang không tự thêm nữa.
    expect(doc("src/app/page.tsx")).not.toContain("<h1");
  });

  it("cùng mã khối, chữ KHÁC nhau → hai tệp; chữ GIỐNG nhau → một tệp", () => {
    const { danhSachTep, doc } = dung();
    // "/" và "/bang-gia" cùng dùng gia-thuc-tra nhưng câu ý đồ khác nhau.
    expect(danhSachTep).toContain("src/components/khoi/gia-thuc-tra.tsx");
    expect(danhSachTep).toContain("src/components/khoi/gia-thuc-tra-2.tsx");
    expect(doc("src/components/khoi/gia-thuc-tra-2.tsx")).toContain("export default function GiaThucTra2(");
    expect(doc("src/app/bang-gia/page.tsx")).toContain('import GiaThucTra2 from "@/components/khoi/gia-thuc-tra-2";');

    const giongNhau = dung(
      kienTruc({
        trang: [
          { duong: "/", tieuDe: "A", mucDich: "a", khoi: [{ ma: "khoi-chot", noiDung: "X" }, { ma: "gia-thuc-tra", noiDung: "Y" }] },
          { duong: "/b", tieuDe: "B", mucDich: "b", khoi: [{ ma: "khoi-chot", noiDung: "X" }, { ma: "gia-thuc-tra", noiDung: "Y" }] },
        ],
      } as Partial<KienTrucWeb>),
    );
    expect(giongNhau.danhSachTep.filter((t) => t.includes("khoi-chot"))).toHaveLength(1);
  });

  it("chưa có chữ thật thì khối lấy câu ý đồ của kiến trúc, không in “Đang cập nhật”", () => {
    const { doc } = dung();
    expect(doc("src/components/khoi/gia-thuc-tra-2.tsx")).toContain("Bảng giá đầy đủ.");
    expect(doc("src/components/khoi/gia-thuc-tra-2.tsx")).not.toContain("Đang cập nhật");
  });

  it("chữ do model viết có dấu nháy, ngoặc nhọn, thẻ script — vẫn ra tệp hợp lệ", () => {
    const doc = dung(kienTruc(), {
      "/#0": {
        tieuDe: 'Giá "thật" — {không} <script>alert(1)</script>',
        dan: "Dòng một\nDòng hai `backtick` ${biến}",
      },
    }).doc("src/components/khoi/hero-anh.tsx");
    expect(doc).toContain('{"Giá \\"thật\\" — {không} <script>alert(1)</script>"}');
    expect(doc).toContain("Dòng một\\nDòng hai `backtick` ${biến}");
    // Không có dấu ngoặc nhọn hay thẻ lạ nào lọt ra ngoài chuỗi.
    expect(doc).not.toContain("<script>alert(1)</script></");
  });

  it("khối chưa có khuôn dựng thì bỏ qua và ghi lại, không ném lỗi", () => {
    const kq = dung(
      kienTruc({
        trang: [
          {
            duong: "/",
            tieuDe: "Trang chủ",
            mucDich: "x",
            khoi: [
              { ma: "hero-anh", noiDung: "a" },
              { ma: "so-do-phan-khu", noiDung: "b" },
            ],
          },
        ],
      } as Partial<KienTrucWeb>),
    );
    expect(kq.boQua).toEqual(["so-do-phan-khu"]);
    expect(kq.doc("src/app/page.tsx")).not.toContain("so-do-phan-khu");
  });

  it("hệ thiết kế đi vào globals.css; nhịp và góc theo lựa chọn", () => {
    const css = dung().doc("src/app/globals.css");
    expect(css).toContain("--nen: #0b1f1a;");
    expect(css).toContain("--nhan: #2fb583;");
    expect(css).toContain("--nhip: 4.5rem;");
    expect(css).toContain("--bo: 0.5rem;");
    expect(css).toContain('--font-tieu-de: "Fraunces"');
  });

  it("layout gắn đúng khối chung và nạp font qua thẻ link", () => {
    const layout = dung().doc("src/app/layout.tsx");
    expect(layout).toContain("<DauTrang />");
    expect(layout).toContain("<ChanTrang />");
    expect(layout).toContain("<LienHeNoi />");
    expect(layout).toContain("fonts.googleapis.com/css2?family=Fraunces");
    // `next/font` tải font lúc build → máy không có mạng là build gãy.
    expect(layout).not.toContain("next/font");
  });

  it("khối chung không bị lặp lại trong từng trang", () => {
    const { doc } = dung();
    expect(doc("src/app/page.tsx")).not.toContain("DauTrang");
  });

  it("sitemap và robots dùng đúng địa chỉ đã cho", () => {
    const { doc } = dung();
    expect(doc("src/app/sitemap.ts")).toContain('"https://binhminh.vn"');
    expect(doc("src/app/sitemap.ts")).toContain('["/","/bang-gia"]');
    expect(doc("src/app/robots.ts")).toContain("/sitemap.xml");
  });

  it("hỏi đáp sinh kèm JSON-LD đọc được", () => {
    const { doc } = dung(
      kienTruc({
        trang: [
          {
            duong: "/",
            tieuDe: "Trang chủ",
            mucDich: "x",
            khoi: [
              { ma: "cau-hoi-thuong-gap", noiDung: "Hỏi đáp" },
              { ma: "khoi-chot", noiDung: "Chốt" },
            ],
          },
        ],
      } as Partial<KienTrucWeb>),
      { "/#0": { muc: [{ tieuDe: "Có đau không?", than: "Có tê tại chỗ." }] } },
    );
    const faq = doc("src/components/khoi/cau-hoi-thuong-gap.tsx");
    // Bắt trọn MỘT chuỗi JS có thoát ký tự. Không dùng `.*?` — chính JSON bên
    // trong cũng chứa `}}` nên bản cũ cắt ngang giữa chuỗi.
    const json = /__html: ("(?:[^"\\]|\\.)*")/.exec(faq);
    expect(json).not.toBeNull();
    const du = JSON.parse(JSON.parse(json![1]!)) as { mainEntity: Array<{ name: string }> };
    expect(du.mainEntity[0]!.name).toBe("Có đau không?");
  });

  it("mã khối của khuôn đều có trong danh mục, tên component không trùng", () => {
    const trongDanhMuc = new Set(DANH_MUC_THANH_PHAN.map((t) => t.ma));
    for (const k of MAU_KHOI) expect(trongDanhMuc.has(k.ma), k.ma).toBe(true);
    const ten = MAU_KHOI.map((k) => k.component);
    expect(new Set(ten).size).toBe(ten.length);
    expect(timMauKhoi("HERO-ANH")?.component).toBe("MoDau");
  });

  it("mọi khuôn khối đều sinh ra tệp có export mặc định đúng tên", () => {
    for (const k of MAU_KHOI) {
      const ra = k.sinh(
        {},
        { tenWebsite: "T", dienThoai: "0900", zalo: "z", trang: [{ duong: "/", tieuDe: "Trang chủ" }], anh: [] },
      );
      expect(ra, k.ma).toContain(`export default function ${k.component}(`);
    }
  });

  it("không có link Zalo thì KHÔNG dựng nút Zalo (nút đó từng gọi điện)", () => {
    const kq = dungCayTep(kienTruc(), THIET_KE, { dienThoai: "0912 345 678" });
    const theo = new Map(kq.cay.tep.map((t) => [t.duongDan, t.noiDung]));
    expect(theo.get("src/components/khoi/lien-he-noi.tsx")).not.toContain("Nhắn Zalo");
    expect(theo.get("src/components/khoi/site-footer.tsx")).not.toContain(">Zalo<");
    // Có link thì nút hiện, và trỏ đúng link chứ không phải tel:
    const coZalo = dungCayTep(kienTruc(), THIET_KE, { dienThoai: "0912 345 678", zalo: "https://zalo.me/0912345678" });
    const theo2 = new Map(coZalo.cay.tep.map((t) => [t.duongDan, t.noiDung]));
    expect(theo2.get("src/components/khoi/lien-he-noi.tsx")).toContain('href="https://zalo.me/0912345678"');
  });

  it("ảnh thật: ghi vào public/anh/ dưới dạng NHỊ PHÂN và vào khối mở đầu", () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const kq = dung(kienTruc(), {}, [
      { ten: "mặt tiền/lạ.webp", alt: "Mặt tiền phòng khám", bytes },
      { ten: "sân.webp", alt: "Sân", bytes },
    ]);
    // Tên tệp được làm sạch (tên trên Drive do người dùng đặt, không tin được).
    const anhTep = kq.danhSachTep.filter((t) => t.startsWith("public/anh/"));
    expect(anhTep).toHaveLength(2);
    for (const t of anhTep) expect(t).toMatch(/^public\/anh\/[A-Za-z0-9._-]+$/);
    // Ghi nguyên Buffer, không ép thành chuỗi.
    expect(Buffer.isBuffer(kq.theoDuong.get(anhTep[0]!))).toBe(true);
    // Khối mở đầu dùng tấm đầu tiên, kèm alt.
    const hero = kq.doc("src/components/khoi/hero-anh.tsx");
    expect(hero).toContain(`src="/${anhTep[0]!.slice("public/".length)}"`);
    expect(hero).toContain('alt="Mặt tiền phòng khám"');
  });

  it("không có ảnh thì khối mở đầu không có thẻ img, và dải ảnh tự biến mất", () => {
    const khongAnh = dung(
      kienTruc({
        trang: [
          {
            duong: "/",
            tieuDe: "Trang chủ",
            mucDich: "x",
            khoi: [
              { ma: "hero-anh", noiDung: "a" },
              { ma: "dai-anh-lon", noiDung: "b" },
            ],
          },
        ],
      } as Partial<KienTrucWeb>),
    );
    expect(khongAnh.doc("src/components/khoi/hero-anh.tsx")).not.toContain("<img");
    expect(khongAnh.doc("src/components/khoi/dai-anh-lon.tsx")).toContain("<></>");
  });

  it("đã lập bảng khách → .env.example điền sẵn địa chỉ nhận, KHÔNG kèm token", () => {
    const kq = dungCayTep(kienTruc(), THIET_KE, {
      dienThoai: "0912 345 678",
      webhookKhach: "https://antigravity.example/api/v1/lien-he/p1",
    });
    const theo = new Map(kq.cay.tep.map((t) => [t.duongDan, typeof t.noiDung === "string" ? t.noiDung : ""]));
    const env = theo.get(".env.example")!;
    expect(env).toContain("LEAD_WEBHOOK_URL=https://antigravity.example/api/v1/lien-he/p1");
    // Token là thứ không thu hồi được khi tệp nén đã tới tay khách.
    expect(env).toMatch(/LEAD_WEBHOOK_TOKEN=\s*$/m);
    expect(theo.get("README.md")).toContain("dán thêm `LEAD_WEBHOOK_TOKEN`");
    // Chưa lập bảng thì để trống, và README nói cách khác.
    const chua = dungCayTep(kienTruc(), THIET_KE, { dienThoai: "0912 345 678" });
    const theo2 = new Map(chua.cay.tep.map((t) => [t.duongDan, typeof t.noiDung === "string" ? t.noiDung : ""]));
    expect(theo2.get(".env.example")).toMatch(/LEAD_WEBHOOK_URL=\s*$/m);
  });

  it("lamSlug bỏ dấu tiếng Việt", () => {
    expect(lamSlug("Nha khoa Bình Minh")).toBe("nha-khoa-binh-minh");
    expect(lamSlug("Đường 3/2")).toBe("duong-3-2");
    expect(lamSlug("!!!")).toBe("website");
  });
});

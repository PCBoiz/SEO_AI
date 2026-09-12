import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { soatCayTep } from "@/domain/dung-web/soat-cay-tep";
import { chuanHoaZalo, dungCayTep, lamSlug, type AnhChoWeb } from "@/domain/dung-web/dung-cay-tep";
import { kienTrucSchema, type KienTrucWeb } from "@/domain/dung-web/kien-truc";
import { heThietKeSchema, type HeThietKe } from "@/domain/dung-web/he-thiet-ke";
import { MAU_KHOI, coMauKhoi, timMauKhoi } from "@/domain/dung-web/khoi/mau-khoi";
import { DANH_MUC_THANH_PHAN, danhMucChoAi } from "@/domain/dung-web/danh-muc-thanh-phan";

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

// Tên, số, tên miền đều bịa để thử; đuôi `.example` dành riêng cho ví dụ.
const THONG_TIN = { dienThoai: "0900 000 000", zalo: "https://zalo.me/0900000000", diaChi: "https://binh-minh.example" };

function dung(kt = kienTruc(), noiDung = {}, anh: AnhChoWeb[] = []) {
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
    for (const can of ["package.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs", "next-env.d.ts", "src/app/layout.tsx", "src/app/globals.css", "src/app/sitemap.ts", "src/app/robots.ts", "src/app/api/lien-he/route.ts", "README.md", "src/lib/su-kien.ts", "src/instrumentation-client.ts"]) {
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
    // Không có font tự lưu thì không có component tải trước.
    expect(layout).not.toContain("TaiTruocFont");
  });

  it("khối chung không bị lặp lại trong từng trang", () => {
    const { doc } = dung();
    expect(doc("src/app/page.tsx")).not.toContain("DauTrang");
  });

  it("sitemap và robots dùng đúng địa chỉ đã cho — qua GOC của meta.ts", () => {
    const { doc } = dung();
    expect(doc("src/lib/thong-tin.ts")).toContain('diaChi: "https://binh-minh.example"');
    expect(doc("src/app/sitemap.ts")).toContain('import { GOC } from "@/lib/meta"');
    expect(doc("src/app/sitemap.ts")).toContain('["/","/bang-gia"]');
    // Không có ngày sửa thật thì không ghi — "hôm nay" ở mọi lượt là tín hiệu sai.
    expect(doc("src/app/sitemap.ts")).not.toContain("lastModified");
    expect(doc("src/app/robots.ts")).toContain("/sitemap.xml");
  });

  it("tên, số điện thoại, Zalo, địa chỉ nằm ở MỘT tệp; khối chỉ đọc qua THONG_TIN/LINK_GOI", () => {
    const { doc, danhSachTep } = dung();
    const tt = doc("src/lib/thong-tin.ts");
    expect(tt).toContain('ten: "Nha khoa Bình Minh"');
    expect(tt).toContain('dienThoai: "0900 000 000"');
    expect(tt).toContain('zalo: "https://zalo.me/0900000000"');
    expect(tt).toContain("export const LINK_GOI");
    // Không khối nào, trang nào gõ thẳng số hay `tel:` — đổi số là sửa một dòng.
    for (const d of danhSachTep.filter((x) => x.startsWith("src/components/") || x.startsWith("src/app/"))) {
      expect(doc(d), d).not.toContain('href="tel:');
      expect(doc(d), d).not.toContain("0900 000 000");
    }
    // Khối có nút gọi thì có dòng nhập; đầu trang dùng tên từ thong-tin.
    expect(doc("src/components/khoi/hero-anh.tsx")).toContain('from "@/lib/thong-tin"');
    expect(doc("src/components/khoi/hero-anh.tsx")).toContain("href={LINK_GOI}");
    expect(doc("src/components/khoi/site-header.tsx")).toContain("{THONG_TIN.ten}");
  });

  it("thẻ meta mỗi trang qua meta(): Open Graph cho Zalo/Facebook, ảnh chia sẻ là tấm đầu", () => {
    const bytes = Buffer.from([1, 2, 3]);
    const { doc } = dung(kienTruc(), {}, [{ ten: "mat-tien.webp", alt: "Mặt tiền", bytes }]);
    expect(doc("src/app/bang-gia/page.tsx")).toContain('export const metadata = meta("Bảng giá", "Xem giá thật trước khi tới.", "/bang-gia")');
    expect(doc("src/app/bang-gia/page.tsx")).not.toContain("import type { Metadata }");
    const m = doc("src/lib/meta.ts");
    expect(m).toContain('locale: "vi_VN"');
    expect(m).toContain("metadataBase");
    expect(m).toContain('const ANH_CHIA_SE = {"url":"/anh/mat-tien.webp","alt":"Mặt tiền"}');
    // Không ảnh thì không bịa ảnh chia sẻ.
    expect(dung().doc("src/lib/meta.ts")).toContain("const ANH_CHIA_SE = null");
  });

  it("có icon tab, trang 404 tiếng Việt, màu thanh trình duyệt, đầu HTTP an toàn", () => {
    const { doc } = dung();
    const icon = doc("src/app/icon.svg");
    expect(icon).toContain(">N</text>");
    expect(icon).toContain('fill="#2fb583"');
    // Tên bắt đầu bằng đ vẫn ra chữ cái, không ra ký tự lạ.
    expect(dung(kienTruc({ tenWebsite: "đồ gỗ Tùng" } as Partial<KienTrucWeb>)).doc("src/app/icon.svg")).toContain(">Đ</text>");
    const k404 = doc("src/app/not-found.tsx");
    expect(k404).toContain("Trang này không có");
    expect(k404).toContain("href={LINK_GOI}");
    const layout = doc("src/app/layout.tsx");
    expect(layout).toContain('themeColor: "#0b1f1a"');
    // Google Analytics chỉ khi có mã — không đặt thì không nhúng gì. Layout chỉ
    // tải thư viện; khởi động nằm ở instrumentation-client (đi trước mọi sự kiện).
    expect(layout).toContain("{GA_ID ? <Script src={`https://www.googletagmanager.com/gtag/js?id=");
    expect(layout).not.toContain('id="ga"');
    expect(doc("next.config.ts")).toContain("nosniff");
    expect(doc(".env.example")).toContain("NEXT_PUBLIC_DIA_CHI=");
    expect(doc(".env.example")).toContain("NEXT_PUBLIC_GA_ID=");
    expect(doc("README.md")).toContain("src/lib/thong-tin.ts");
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

  it("JSON-LD: chữ có </script> không đóng được thẻ script, máy đọc vẫn ra đúng chữ", () => {
    const { doc } = dung(
      kienTruc({
        trang: [
          {
            duong: "/",
            tieuDe: "Trang chủ",
            mucDich: "x",
            khoi: [{ ma: "hero-anh", noiDung: "a" }, { ma: "cau-hoi-thuong-gap", noiDung: "Hỏi đáp" }],
          },
        ],
      } as Partial<KienTrucWeb>),
      { "/#1": { muc: [{ tieuDe: "Hỏi?", than: "Trả lời </script><b>xấu</b>" }] } },
    );
    const faq = doc("src/components/khoi/cau-hoi-thuong-gap.tsx");
    const json = /__html: ("(?:[^"\\]|\\.)*")/.exec(faq)!;
    // Chuỗi JS đưa vào HTML không chứa dấu `<` thô.
    const chuoiHtml = JSON.parse(json[1]!) as string;
    expect(chuoiHtml).not.toContain("<");
    const du = JSON.parse(chuoiHtml) as { mainEntity: Array<{ acceptedAnswer: { text: string } }> };
    expect(du.mainEntity[0]!.acceptedAnswer.text).toBe("Trả lời </script><b>xấu</b>");
    // Khối dữ liệu doanh nghiệp cũng thoát `<` lúc chạy.
    const ld = dung(kienTruc({ khoiChung: ["site-header", "du-lieu-co-cau-truc"] } as Partial<KienTrucWeb>)).doc(
      "src/components/khoi/du-lieu-co-cau-truc.tsx",
    );
    expect(ld).toContain(".replace(/</g,");
    expect(ld).toContain("telephone: THONG_TIN.dienThoai");
  });

  it("mã khối của khuôn đều có trong danh mục, tên component không trùng", () => {
    const trongDanhMuc = new Set(DANH_MUC_THANH_PHAN.map((t) => t.ma));
    for (const k of MAU_KHOI) expect(trongDanhMuc.has(k.ma), k.ma).toBe(true);
    const ten = MAU_KHOI.map((k) => k.component);
    expect(new Set(ten).size).toBe(ten.length);
    expect(timMauKhoi("HERO-ANH")?.component).toBe("MoDau");
  });

  it("mọi khuôn khối đều sinh ra tệp có export mặc định đúng tên, và nhắc THONG_TIN thì có dòng nhập", () => {
    for (const k of MAU_KHOI) {
      const ra = k.sinh(
        {},
        { tenWebsite: "T", dienThoai: "0900", zalo: "z", trang: [{ duong: "/", tieuDe: "Trang chủ" }], anh: [] },
      );
      expect(ra, k.ma).toContain(`export default function ${k.component}(`);
      // Khuôn tự dựng chuỗi (không qua tep()) từng quên dòng nhập — tsc của
      // dự án khách mới bắt, tức là sau khi đã cài xong phụ thuộc.
      if (/THONG_TIN|LINK_GOI/.test(ra)) expect(ra, k.ma).toContain('from "@/lib/thong-tin"');
    }
  });

  it("không có link Zalo thì nút Zalo KHÔNG hiện (nút đó từng gọi điện) — quyết định lúc chạy", () => {
    const kq = dungCayTep(kienTruc(), THIET_KE, { dienThoai: "0912 345 678" });
    const theo = new Map(kq.cay.tep.map((t) => [t.duongDan, t.noiDung]));
    expect(theo.get("src/lib/thong-tin.ts")).toContain("zalo: null as string | null");
    // Nút bọc trong điều kiện — không có Zalo thì không vẽ, và KHÔNG rơi về tel:.
    const noi = theo.get("src/components/khoi/lien-he-noi.tsx") as string;
    expect(noi).toContain("{THONG_TIN.zalo ? <a href={THONG_TIN.zalo}");
    expect(noi).not.toContain('href="tel:');
    expect(theo.get("src/components/khoi/site-footer.tsx")).toContain("{THONG_TIN.zalo ? <li>");
    // Có link thì ghi vào thong-tin.ts — thêm sau cũng chỉ sửa một dòng.
    const coZalo = dungCayTep(kienTruc(), THIET_KE, { dienThoai: "0912 345 678", zalo: "https://zalo.me/0912345678" });
    const theo2 = new Map(coZalo.cay.tep.map((t) => [t.duongDan, t.noiDung]));
    expect(theo2.get("src/lib/thong-tin.ts")).toContain('zalo: "https://zalo.me/0912345678" as string | null');
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

  it("biểu mẫu web khách có bẫy bot và tuyến nhận có giới hạn nhịp", () => {
    const { doc } = dung(
      kienTruc({
        trang: [
          { duong: "/", tieuDe: "Trang chủ", mucDich: "x", khoi: [{ ma: "hero-anh", noiDung: "a" }, { ma: "dang-ky-form", noiDung: "b" }] },
        ],
      } as Partial<KienTrucWeb>),
    );
    const form = doc("src/components/khoi/dang-ky-form.tsx");
    expect(form).toContain('name="diaChiWeb"');
    expect(form).toContain('aria-hidden="true"');
    const tuyen = doc("src/app/api/lien-he/route.ts");
    expect(tuyen).toContain("diaChiWeb");
    expect(tuyen).toContain("status: 429");
    expect(tuyen).toContain("cf-connecting-ip");
    // Trình duyệt mới dịch `pattern` với cờ "v": ( ) - viết trần trong [] là mẫu
    // hỏng — trình duyệt bỏ kiểm tra và ghi lỗi ra console. Bắt được khi bấm thử
    // web mẫu 13/09, không phép thử nào thấy trước đó. Mẫu phải dịch được với cờ
    // v, và nhận/từ chối giống hệt phép kiểm ở máy chủ.
    const pattern = form.match(/pattern="([^"]+)"/)?.[1] ?? "";
    const trinhDuyet = new RegExp(`^(?:${pattern})$`, "v");
    const mayChu = /^[0-9+ ().-]{8,20}$/;
    expect(tuyen).toContain(mayChu.source);
    for (const so of ["0912 345 678", "+84 912 345 678", "(028) 3822 1234", "0912.345.678", "0912-345-678", "abc12345678", "1234567", "0912 345 678 999 000 1"]) {
      expect(trinhDuyet.test(so), so).toBe(mayChu.test(so));
    }
  });

  it("đếm khách liên hệ trong Google Analytics: gọi, Zalo, biểu mẫu — chỉ khi có mã, không gửi thông tin khách", () => {
    const { doc } = dung(
      kienTruc({
        trang: [
          { duong: "/", tieuDe: "Trang chủ", mucDich: "x", khoi: [{ ma: "hero-anh", noiDung: "a" }, { ma: "dang-ky-form", noiDung: "b" }] },
        ],
      } as Partial<KienTrucWeb>),
    );
    const suKien = doc("src/lib/su-kien.ts");
    expect(suKien).toContain('export const SU_KIEN = { goi: "goi_dien", zalo: "nhan_zalo", deLaiSo: "generate_lead" } as const;');
    // Lệnh vào hàng đợi dạng `arguments`, như đoạn mã của Google.
    expect(suKien).toContain("(window.dataLayer = window.dataLayer || []).push(arguments);");
    expect(suKien).toContain('if (!process.env.NEXT_PUBLIC_GA_ID || typeof window === "undefined") return;');

    const khoiDong = doc("src/instrumentation-client.ts");
    expect(khoiDong).toContain("if (GA_ID) {");
    // "config" vào hàng đợi TRƯỚC khi gắn bộ nghe lượt bấm.
    const choConfig = khoiDong.indexOf('gtag("config", GA_ID);');
    expect(choConfig).toBeGreaterThan(-1);
    expect(choConfig).toBeLessThan(khoiDong.indexOf("document.addEventListener("));
    expect(khoiDong).toContain('href.startsWith("tel:") ? SU_KIEN.goi : laZalo(href) ? SU_KIEN.zalo : null');
    expect(khoiDong).not.toContain("dienThoai");

    const form = doc("src/components/khoi/dang-ky-form.tsx");
    expect(form).toContain('import { guiSuKien, SU_KIEN } from "@/lib/su-kien";');
    // Chỉ đếm khi máy chủ báo đã nhận; không kèm tên hay số của khách.
    expect(form).toContain("if (dap.ok) guiSuKien(SU_KIEN.deLaiSo);");
    expect(form.match(/guiSuKien\(/g)).toHaveLength(1);

    expect(doc("src/components/khoi/lien-he-noi.tsx")).toContain('data-vi-tri="thanh-noi"');
    // Soát coi tệp này là bắt buộc: biểu mẫu nhập nó, thiếu là build gãy.
    const cay = dung().cay;
    const thieu = { ...cay, tep: cay.tep.filter((t) => t.duongDan !== "src/lib/su-kien.ts") };
    expect(soatCayTep(thieu).some((l) => l.tep === "src/lib/su-kien.ts" && l.loi === "thiếu tệp bắt buộc")).toBe(true);
  });

  it("khối địa chỉ: có địa chỉ thì có bản đồ nhúng + chỉ đường; không có thì không bịa bản đồ", () => {
    const kt = kienTruc({
      trang: [{ duong: "/", tieuDe: "Trang chủ", mucDich: "x", khoi: [{ ma: "hero-anh", noiDung: "a" }, { ma: "dia-chi-gio-mo", noiDung: "Địa chỉ và giờ" }] }],
    } as Partial<KienTrucWeb>);
    const co = dung(kt, {
      "/#1": { diaChi: "12 Trần Hưng Đạo, Hạ Long, Quảng Ninh", gioMo: ["Thứ 2–6: 8:00–20:00", "Chủ nhật: nghỉ"], ghiChu: "Đỗ xe trước cửa." },
    }).doc("src/components/khoi/dia-chi-gio-mo.tsx");
    expect(co).toContain('src="https://www.google.com/maps?q=12%20Tr%E1%BA%A7n%20H%C6%B0ng%20%C4%90%E1%BA%A1o%2C%20H%E1%BA%A1%20Long%2C%20Qu%E1%BA%A3ng%20Ninh&output=embed"');
    expect(co).toContain('loading="lazy"');
    expect(co).toContain("Chỉ đường");
    expect(co).toContain("Chủ nhật: nghỉ");
    expect(co).toContain("href={LINK_GOI}");
    const khong = dung(kt).doc("src/components/khoi/dia-chi-gio-mo.tsx");
    expect(khong).not.toContain("<iframe");
    expect(khong).toContain("Địa chỉ đang cập nhật");
    // Danh mục mời khối này (có khuôn) và soát sạch.
    expect(danhMucChoAi("chung", coMauKhoi)).toContain("- dia-chi-gio-mo [vi-tri]");
  });

  it("font tự lưu: tệp woff2 vào public/fonts, @font-face trong globals.css, layout chỉ preload — không gọi Google", () => {
    const font = {
      css: `/* latin */
@font-face {
  font-family: "Fraunces";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(/fonts/fraunces-latin-abcdef0123.woff2) format("woff2");
  unicode-range: U+0000-00FF;
}`,
      tep: [{ ten: "fraunces-latin-abcdef0123.woff2", bytes: Buffer.from("wOF2-gia") }],
      taiTruoc: ["fraunces-latin-abcdef0123.woff2"],
    };
    const kq = dungCayTep(kienTruc(), THIET_KE, THONG_TIN, {}, [], font);
    const theo = new Map(kq.cay.tep.map((t) => [t.duongDan, t.noiDung]));
    expect(Buffer.isBuffer(theo.get("public/fonts/fraunces-latin-abcdef0123.woff2"))).toBe(true);
    const css = theo.get("src/app/globals.css") as string;
    // @import phải đứng đầu tệp CSS — @font-face đi sau nó.
    expect(css.startsWith('@import "tailwindcss";')).toBe(true);
    expect(css).toContain("src: url(/fonts/fraunces-latin-abcdef0123.woff2)");
    const layout = theo.get("src/app/layout.tsx") as string;
    expect(layout).not.toContain("fonts.googleapis.com");
    // Tải trước qua ReactDOM.preload trong component client — ghi thẳng <link> vào head thì React nhân đôi thẻ.
    expect(layout).not.toContain('rel="preload"');
    expect(layout).toContain('import TaiTruocFont from "@/components/tai-truoc-font";');
    expect(layout).toContain("<TaiTruocFont />");
    const taiTruoc = theo.get("src/components/tai-truoc-font.tsx") as string;
    expect(taiTruoc.startsWith('"use client";')).toBe(true);
    expect(taiTruoc).toContain('const TEP = ["/fonts/fraunces-latin-abcdef0123.woff2"] as const;');
    expect(taiTruoc).toContain('ReactDOM.preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" })');
    expect(theo.get("next.config.ts")).toContain('source: "/fonts/:path*"');
    expect(soatCayTep(kq.cay).filter((l) => l.muc === "nang")).toEqual([]);
  });

  it("ảnh có kích thước thật: width/height ở ảnh mở đầu, dải ảnh và thẻ chia sẻ; ảnh mở đầu tải ưu tiên", async () => {
    const webp = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 1, g: 2, b: 3 } } })
      .webp()
      .toBuffer();
    const kt = kienTruc({
      trang: [
        { duong: "/", tieuDe: "Trang chủ", mucDich: "x", khoi: [{ ma: "hero-anh", noiDung: "a" }, { ma: "dai-anh-lon", noiDung: "b" }] },
      ],
    } as Partial<KienTrucWeb>);
    const that = dung(kt, {}, [
      { ten: "mat-tien.webp", alt: "Mặt tiền", bytes: webp },
      { ten: "sanh.webp", alt: "Sảnh", bytes: webp },
    ]);
    const hero = that.doc("src/components/khoi/hero-anh.tsx");
    expect(hero).toContain("width={800}");
    expect(hero).toContain("height={600}");
    expect(hero).toContain('fetchPriority="high"');
    expect(that.doc("src/components/khoi/dai-anh-lon.tsx").match(/width=\{800\}/g)).toHaveLength(2);
    expect(that.doc("src/lib/meta.ts")).toContain('"width":800,"height":600');
    // Không đọc được kích thước (tệp giả): ảnh mở đầu dùng 1200×900 theo ô 4:3, dải ảnh bỏ thuộc tính.
    const gia = dung(kt, {}, [{ ten: "a.webp", alt: "A", bytes: Buffer.from([1, 2, 3]) }]);
    expect(gia.doc("src/components/khoi/hero-anh.tsx")).toContain("width={1200}");
    expect(gia.doc("src/components/khoi/dai-anh-lon.tsx")).not.toContain("width=");
    // Không có bản nhỏ thì thẻ img chỉ có src.
    expect(hero).not.toContain("srcSet");
  });

  it("ảnh có bản nhỏ: ghi thêm tệp, ảnh mở đầu và dải ảnh có srcSet + sizes; bản không nhỏ hơn gốc bị bỏ", async () => {
    const tao = (w: number) =>
      sharp({ create: { width: w, height: Math.round((w * 3) / 4), channels: 3, background: { r: 1, g: 2, b: 3 } } })
        .webp()
        .toBuffer();
    const [goc, b800, b400] = await Promise.all([tao(1600), tao(800), tao(400)]);
    const kt = kienTruc({
      trang: [
        { duong: "/", tieuDe: "Trang chủ", mucDich: "x", khoi: [{ ma: "hero-anh", noiDung: "a" }, { ma: "dai-anh-lon", noiDung: "b" }] },
      ],
    } as Partial<KienTrucWeb>);
    const that = dung(kt, {}, [
      // Đưa lộn xộn, kèm một bản "1600" bằng gốc và một bản 800 trùng: chỉ giữ 400 và 800, xếp tăng dần.
      { ten: "mat-tien.webp", alt: "Mặt tiền", bytes: goc, bienThe: [{ rong: 800, bytes: b800 }, { rong: 1600, bytes: goc }, { rong: 400, bytes: b400 }, { rong: 800, bytes: b800 }] },
    ]);
    expect(that.danhSachTep.filter((d) => d.startsWith("public/anh/"))).toEqual(["public/anh/mat-tien.webp", "public/anh/mat-tien-400.webp", "public/anh/mat-tien-800.webp"]);
    expect(that.theoDuong.get("public/anh/mat-tien-800.webp")).toBe(b800);
    const hero = that.doc("src/components/khoi/hero-anh.tsx");
    expect(hero).toContain('srcSet="/anh/mat-tien-400.webp 400w, /anh/mat-tien-800.webp 800w, /anh/mat-tien.webp 1600w"');
    expect(hero).toContain('sizes="(min-width: 1296px) 34.25rem, (min-width: 768px) calc(50vw - 3.75rem), calc(100vw - 3rem)"');
    expect(hero).toContain('src="/anh/mat-tien.webp"');
    const dai = that.doc("src/components/khoi/dai-anh-lon.tsx");
    expect(dai).toContain('srcSet="/anh/mat-tien-400.webp 400w, /anh/mat-tien-800.webp 800w, /anh/mat-tien.webp 1600w"');
    // Ô cao 16rem/22rem, ảnh 4:3 → rộng 21.3rem / 29.3rem.
    expect(dai).toContain('sizes="(min-width: 768px) 29.3rem, 21.3rem"');
    // Bản nhỏ mà không đọc được kích thước gốc thì bỏ cả (không ghi tệp thừa, không srcSet).
    const mu = dung(kt, {}, [{ ten: "a.webp", alt: "A", bytes: Buffer.from([1, 2, 3]), bienThe: [{ rong: 800, bytes: b800 }] }]);
    expect(mu.danhSachTep.filter((d) => d.startsWith("public/anh/"))).toEqual(["public/anh/a.webp"]);
    expect(mu.doc("src/components/khoi/hero-anh.tsx")).not.toContain("srcSet");
  });

  it("ô Zalo: gõ số điện thoại thì thành link zalo.me, thiếu https thì thêm, trống thì null", () => {
    expect(chuanHoaZalo("0912 345 678")).toBe("https://zalo.me/0912345678");
    expect(chuanHoaZalo("+84 912 345 678")).toBe("https://zalo.me/0912345678");
    expect(chuanHoaZalo("zalo.me/0912345678")).toBe("https://zalo.me/0912345678");
    expect(chuanHoaZalo("https://zalo.me/nhakhoa")).toBe("https://zalo.me/nhakhoa");
    expect(chuanHoaZalo("  ")).toBeNull();
    expect(chuanHoaZalo(undefined)).toBeNull();
    // Đi trọn đường: số gõ vào ô Zalo ra link bấm được trong thong-tin.ts.
    const kq = dungCayTep(kienTruc(), THIET_KE, { dienThoai: "0912 345 678", zalo: "0912345678" });
    const tt = kq.cay.tep.find((t) => t.duongDan === "src/lib/thong-tin.ts")!.noiDung as string;
    expect(tt).toContain('zalo: "https://zalo.me/0912345678"');
  });

  it("Cloudflare: _headers cache tệp tĩnh nằm trong trien-khai/, hướng dẫn chép vào public/; bản tải về không mang sẵn", () => {
    const { doc, danhSachTep } = dung();
    const h = doc("trien-khai/cloudflare/_headers");
    expect(h).toContain("/_next/static/*");
    expect(h).toContain("/fonts/*");
    expect(h).toContain("/anh/*");
    expect(doc("trien-khai/cloudflare/HUONG-DAN.md")).toContain("cp trien-khai/cloudflare/_headers public/");
    // Trên VPS (next start) public/_headers sẽ bị phục vụ như tệp thường — chỉ Cloudflare đọc nó.
    expect(danhSachTep).not.toContain("public/_headers");
  });

  it("lamSlug bỏ dấu tiếng Việt", () => {
    expect(lamSlug("Nha khoa Bình Minh")).toBe("nha-khoa-binh-minh");
    expect(lamSlug("Đường 3/2")).toBe("duong-3-2");
    expect(lamSlug("!!!")).toBe("website");
  });
});

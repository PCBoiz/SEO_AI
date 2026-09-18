import { describe, expect, it } from "vitest";
import { dungCayTep, type AnhChoWeb } from "@/domain/dung-web/dung-cay-tep";
import { kienTrucSchema, type KienTrucWeb } from "@/domain/dung-web/kien-truc";
import { heThietKeSchema, type HeThietKe } from "@/domain/dung-web/he-thiet-ke";
import { MAU_KHOI } from "@/domain/dung-web/khoi/mau-khoi";
import { doiDuongDan, lopTrongHtml, tepTrongCay, veTrangTinh } from "@/lib/dung-web/ve-trang-tinh";

/**
 * Bộ vẽ trang tĩnh: cây tệp Next.js do `dungCayTep` sinh → HTML xem được ngay,
 * không cài gì. Kiểm ở đây là kiểm CẢ HAI ĐẦU: khuôn khối nào cũng phải vẽ
 * được (khối mới thêm vào mà dùng thứ bộ nạp không biết thì đỏ ở đây, không
 * phải lúc chủ dự án bấm xem).
 */

const THIET_KE: HeThietKe = heThietKeSchema.parse({
  mau: { nen: "#0b1f1a", chu: "#f4f1ea", nhan: "#2fb583", phu: "#9fb5ad" },
  font: { tieuDe: "Fraunces", than: "Be Vietnam Pro" },
  khoangCach: "vua",
  goc: "bo-nhe",
  giong: ["điềm đạm", "rõ ràng"],
  lyDo: "Nền tối chữ sáng.",
});

// Tên, số, tên miền đều bịa để thử.
const THONG_TIN = { dienThoai: "0900 000 000", zalo: "https://zalo.me/0900000000", diaChi: "https://binh-minh.example" };
const TIEN_TO = "/api/v1/projects/p1/dung-web/xem-truoc/trang";
const TUY_CHON = { tienTo: TIEN_TO, nonce: "abc123" };

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
          { ma: "dang-ky-form", noiDung: "Để lại số, gọi lại trong 15 phút." },
        ],
      },
      {
        duong: "/bang-gia",
        tieuDe: "Bảng giá",
        mucDich: "Xem giá thật trước khi tới.",
        khoi: [
          { ma: "cau-hoi-thuong-gap", noiDung: "Ba câu hay gặp." },
          { ma: "khoi-chot", noiDung: "Chốt: gọi để tư vấn." },
        ],
      },
    ],
    canVietMoi: [],
    duLieuCan: [],
    ...sua,
  });
}

/** Một PNG 2×1 hợp lệ — đủ để `kichThuocAnh` đọc ra kích thước. */
const PNG_2x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+9AAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);
const ANH: AnhChoWeb[] = [{ ten: "mat-tien.webp", alt: "Mặt tiền phòng khám", bytes: PNG_2x1 }];

describe("veTrangTinh — HTML xem được ngay từ cây tệp", () => {
  it("vẽ trang chủ: có h1, CSS đã biên dịch, tiêu đề, không sót JSX", async () => {
    const { cay } = dungCayTep(kienTruc(), THIET_KE, THONG_TIN, {}, ANH);
    const kq = await veTrangTinh(cay, "/", TUY_CHON);
    expect(kq.ok, kq.ok ? "" : kq.loi).toBe(true);
    if (!kq.ok) return;
    expect(kq.html.startsWith("<!DOCTYPE html><html lang=\"vi\">")).toBe(true);
    expect(kq.html).toContain("<h1");
    expect(kq.html).toContain("Nha khoa Bình Minh");
    expect(kq.tieuDe).toBe("Nha khoa Bình Minh");
    expect(kq.html).toContain("<title>Nha khoa Bình Minh</title>");
    // React đã chạy thật: không còn className, không còn {biểu thức}.
    expect(kq.html).not.toContain("className=");
    expect(kq.html).not.toMatch(/\{THONG_TIN/);
    expect(kq.html).toContain("Gọi 0900 000 000");
    // Tailwind biên dịch: lớp có trong HTML thì có luật CSS; biến hệ thiết kế giữ nguyên.
    expect(kq.html).toContain("<style>");
    expect(kq.html).toMatch(/\.khung\s*\{/);
    expect(kq.html).toContain("--nen: #0b1f1a");
    expect(kq.html).toMatch(/\.md\\:text-4xl/);
    // Biểu mẫu (`"use client"` + useState) vẽ được ở trạng thái đầu.
    expect(kq.html).toContain("<form");
    // Script báo trang + chặn gửi biểu mẫu mang nonce.
    expect(kq.html).toContain('<script nonce="abc123">');
    expect(kq.html).toContain('duong:"/"');
    expect(kq.html).toContain('id="xem-truoc-bao"');
  });

  it("liên kết nội bộ và ảnh trỏ về tuyến xem thử, liên kết ngoài giữ nguyên", async () => {
    const { cay } = dungCayTep(kienTruc(), THIET_KE, THONG_TIN, {}, ANH);
    const kq = await veTrangTinh(cay, "/", TUY_CHON);
    if (!kq.ok) throw new Error(kq.loi);
    expect(kq.html).toContain(`href="${TIEN_TO}/bang-gia"`);
    expect(kq.html).toContain(`href="${TIEN_TO}"`);
    expect(kq.html).not.toMatch(/href="\/bang-gia"/);
    expect(kq.html).toContain(`src="${TIEN_TO}/anh/mat-tien.webp"`);
    expect(kq.html).toContain(`href="${TIEN_TO}/icon.svg"`);
    expect(kq.html).toContain('href="tel:0900000000"');
    expect(kq.html).toContain('href="https://zalo.me/0900000000"');
    // Không gắn tiền tố hai lần.
    expect(kq.html).not.toContain(`${TIEN_TO}${TIEN_TO}`);
  });

  it("trang thứ hai vẽ được, trang không có thì báo rõ", async () => {
    const { cay } = dungCayTep(kienTruc(), THIET_KE, THONG_TIN);
    const kq = await veTrangTinh(cay, "/bang-gia", TUY_CHON);
    expect(kq.ok, kq.ok ? "" : kq.loi).toBe(true);
    if (kq.ok) {
      expect(kq.tieuDe).toBe("Bảng giá · Nha khoa Bình Minh");
      expect(kq.html).toContain("<h1");
    }
    const khong = await veTrangTinh(cay, "/khong-co", TUY_CHON);
    expect(khong.ok).toBe(false);
    if (!khong.ok) expect(khong.loi).toContain("/khong-co");
  });

  it("MỌI khuôn khối trong danh mục đều vẽ được (khối mới dùng gói lạ thì đỏ ở đây)", async () => {
    const chung = ["site-header", "site-footer", "lien-he-noi", "marquee", "du-lieu-co-cau-truc", "thanh-quyet-dinh"];
    const cuaTrang = MAU_KHOI.map((m) => m.ma).filter((ma) => !chung.includes(ma));
    // Schema kiến trúc: mỗi trang 2–12 khối → chia đều thành nhiều trang.
    const moiTrang = 6;
    const trang = [];
    for (let i = 0; i < cuaTrang.length; i += moiTrang) {
      const khoi = cuaTrang.slice(i, i + moiTrang);
      if (khoi.length < 2) khoi.push("khoi-chot");
      trang.push({
        duong: i === 0 ? "/" : `/trang-${i}`,
        tieuDe: `Trang ${i}`,
        mucDich: "Thử mọi khối.",
        khoi: khoi.map((ma) => ({ ma, noiDung: `Khối ${ma}.` })),
      });
    }
    const kt = kienTruc({ khoiChung: chung, trang });
    const { cay, boQua } = dungCayTep(kt, THIET_KE, THONG_TIN, {}, ANH);
    expect(boQua).toEqual([]);
    for (const t of trang) {
      const kq = await veTrangTinh(cay, t.duong, TUY_CHON);
      expect(kq.ok, kq.ok ? "" : `${t.duong}: ${kq.loi}`).toBe(true);
      if (kq.ok) expect(kq.html.length).toBeGreaterThan(5_000);
    }
  });

  it("tệp trong cây: ảnh trả đúng kiểu, thiếu thì null", () => {
    const { cay } = dungCayTep(kienTruc(), THIET_KE, THONG_TIN, {}, ANH);
    expect(tepTrongCay(cay, "public/anh/mat-tien.webp")?.kieu).toBe("image/webp");
    expect(tepTrongCay(cay, "src/app/icon.svg")?.kieu).toBe("image/svg+xml");
    expect(tepTrongCay(cay, "public/anh/khong-co.webp")).toBeNull();
  });
});

describe("doiDuongDan / lopTrongHtml — hàm thuần", () => {
  it("đổi href/src/srcset gốc `/`, giữ tel:, https:, `//`", () => {
    const vao =
      '<a href="/">A</a><a href="/x">B</a><a href="//cdn.example/y">C</a><a href="tel:0900">D</a>' +
      '<img src="/anh/a.webp" srcset="/anh/a-800.webp 800w, /anh/a-1200.webp 1200w">';
    const ra = doiDuongDan(vao, "/t");
    expect(ra).toBe(
      '<a href="/t">A</a><a href="/t/x">B</a><a href="//cdn.example/y">C</a><a href="tel:0900">D</a>' +
        '<img src="/t/anh/a.webp" srcset="/t/anh/a-800.webp 800w, /t/anh/a-1200.webp 1200w">',
    );
  });

  it("gom lớp CSS, không trùng", () => {
    expect(lopTrongHtml('<a class="nut nut-chinh md:text-sm"></a><p class="nut"></p>')).toEqual(["nut", "nut-chinh", "md:text-sm"]);
  });
});

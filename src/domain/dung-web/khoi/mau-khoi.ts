import {
  chu,
  chuoi,
  layChu,
  layDanhSach,
  layMuc,
  moTa,
  type BoiCanhSinh,
  type KhoiMau,
  type NoiDungKhoi,
} from "./kieu";

/**
 * Bộ khuôn khối — bản dựng được của danh mục. Xem lý do ở `kieu.ts`.
 *
 * Quy ước chung của mọi khuôn:
 *   · một khối = một tệp `src/components/khoi/<ma>.tsx`, export mặc định;
 *   · chỉ dùng React + lớp CSS khai trong `globals.css` (`khung`, `nhip`,
 *     `the`, `nut`…) + tiện ích bố cục của Tailwind. KHÔNG token màu của
 *     Tailwind — màu đi qua biến CSS, xem `khung-du-an.ts`;
 *   · không trạng thái, không hiệu ứng, không phụ thuộc ngoài — trừ biểu mẫu
 *     (cần `"use client"` vì có gửi dữ liệu).
 */

/** Khung một mảng nội dung: đường kẻ trên, tiêu đề, dẫn nhập, rồi thân. */
function mang(tieuDe: string, dan: string, than: string, khac = ""): string {
  return `    <section className="vien-tren nhip"${khac}>
      <div className="khung">
        <h2 className="tieu-de text-3xl leading-tight md:text-4xl">${chu(tieuDe)}</h2>
        ${dan ? `<p className="chu-phu mt-4 max-w-[60ch] leading-relaxed">${chu(dan)}</p>` : ""}
${than}
      </div>
    </section>`;
}

function tep(component: string, than: string, dungClient = false): string {
  return `${dungClient ? '"use client";\n\n' : ""}export default function ${component}() {
  return (
${than}
  );
}
`;
}

/* ────────────────────────────── Khung trang ────────────────────────────── */

const dauTrang: KhoiMau = {
  ma: "site-header",
  component: "DauTrang",
  truong: [],
  sinh(_nd, ctx) {
    const muc = ctx.trang
      .map((t) => `          <a href=${chuoi(t.duong)} className="chu-phu hover:opacity-80">${chu(t.tieuDe)}</a>`)
      .join("\n");
    return `import Link from "next/link";

export default function DauTrang() {
  return (
    <header className="sticky top-0 z-40 nen-mo vien-duoi">
      <div className="khung flex min-h-16 flex-wrap items-center justify-between gap-4 py-3">
        <Link href="/" className="tieu-de text-lg">${chu(ctx.tenWebsite)}</Link>
        <nav className="flex flex-wrap items-center gap-5 text-sm">
${muc}
          <a href=${chuoi(`tel:${ctx.dienThoai.replace(/\s+/g, "")}`)} className="nut nut-chinh text-sm">${chu(`Gọi ${ctx.dienThoai}`)}</a>
        </nav>
      </div>
    </header>
  );
}
`;
  },
};

const chanTrang: KhoiMau = {
  ma: "site-footer",
  component: "ChanTrang",
  truong: [{ khoa: "moTa", nhan: "Một câu giới thiệu ở chân trang", kieu: "doan" }],
  sinh(nd, ctx) {
    const moTa = layChu(nd, "moTa", `${ctx.tenWebsite} — liên hệ ${ctx.dienThoai}.`);
    const muc = ctx.trang
      .map((t) => `            <li><a href=${chuoi(t.duong)} className="chu-phu hover:opacity-80">${chu(t.tieuDe)}</a></li>`)
      .join("\n");
    return `export default function ChanTrang() {
  return (
    <footer className="vien-tren py-12">
      <div className="khung grid gap-8 md:grid-cols-3">
        <div>
          <p className="tieu-de text-lg">${chu(ctx.tenWebsite)}</p>
          <p className="chu-phu mt-3 max-w-[46ch] text-sm leading-relaxed">${chu(moTa)}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Trang</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
${muc}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Liên hệ</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><a href=${chuoi(`tel:${ctx.dienThoai.replace(/\s+/g, "")}`)} className="chu-nhan">${chu(ctx.dienThoai)}</a></li>${
              ctx.zalo ? `\n            <li><a href=${chuoi(ctx.zalo)} className="chu-phu">Zalo</a></li>` : ""
            }
          </ul>
        </div>
      </div>
    </footer>
  );
}
`;
  },
};

const lienHeNoi: KhoiMau = {
  ma: "lien-he-noi",
  component: "LienHeNoi",
  truong: [],
  sinh(_nd, ctx) {
    const nutZalo = ctx.zalo
      ? `\n      <a href=${chuoi(ctx.zalo)} className="nut nut-phu nen-day flex-1 md:flex-none">${chu("Nhắn Zalo")}</a>`
      : "";
    return `export default function LienHeNoi() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex gap-2 p-3 md:inset-x-auto md:right-6 md:bottom-6 md:p-0">
      <a href=${chuoi(`tel:${ctx.dienThoai.replace(/\s+/g, "")}`)} className="nut nut-chinh flex-1 md:flex-none">${chu("Gọi ngay")}</a>${nutZalo}
    </div>
  );
}
`;
  },
};

/* ───────────────────────────── Mở đầu & chốt ───────────────────────────── */

const moDau: KhoiMau = {
  ma: "hero-anh",
  component: "MoDau",
  truong: [
    { khoa: "tieuDe", nhan: "Câu lớn nhất trang", kieu: "chu", goiY: "Nói thẳng người xem nhận được gì, ≤ 12 từ" },
    { khoa: "dan", nhan: "Một–hai câu đỡ bên dưới", kieu: "doan" },
    { khoa: "nut", nhan: "Chữ trên nút chính", kieu: "chu" },
  ],
  sinh(nd, ctx) {
    const bia = ctx.anh[0];
    // Có ảnh thật thì mảng mở đầu là ảnh + chữ hai cột; không có thì một cột
    // chữ trên nền nhạt. Không bịa ảnh, không dùng ảnh kho nước ngoài.
    const khoiAnh = bia
      ? `
        <div className="mt-10 aspect-[4/3] overflow-hidden bo md:mt-0">
          <img src=${chuoi(`/anh/${bia.ten}`)} alt=${chuoi(bia.alt)} className="h-full w-full object-cover" loading="eager" />
        </div>`
      : "";
    return tep(
      "MoDau",
      `    <section className="nen-nhe nhip">
      <div className="khung grid items-center gap-10${bia ? " md:grid-cols-2" : ""}">
        <div>
          <h1 className="tieu-de max-w-[18ch] text-4xl leading-[1.1] md:text-6xl">${chu(layChu(nd, "tieuDe", ctx.tenWebsite))}</h1>
          <p className="chu-phu mt-6 max-w-[56ch] text-lg leading-relaxed">${chu(layChu(nd, "dan", moTa(nd)))}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#lien-he" className="nut nut-chinh">${chu(layChu(nd, "nut", "Để lại số, tôi gọi lại"))}</a>
            <a href=${chuoi(`tel:${ctx.dienThoai.replace(/\s+/g, "")}`)} className="nut nut-phu">${chu(`Gọi ${ctx.dienThoai}`)}</a>
          </div>
        </div>${khoiAnh}
      </div>
    </section>`,
    );
  },
};

const khoiChot: KhoiMau = {
  ma: "khoi-chot",
  component: "KhoiChot",
  truong: [
    { khoa: "tieuDe", nhan: "Câu chốt", kieu: "chu" },
    { khoa: "dan", nhan: "Một câu nối với phần vừa đọc", kieu: "doan" },
  ],
  sinh(nd, ctx) {
    return tep(
      "KhoiChot",
      mang(
        layChu(nd, "tieuDe", "Còn câu hỏi nào chưa được trả lời?"),
        layChu(nd, "dan", moTa(nd)),
        `        <div className="mt-8 flex flex-wrap gap-3">
          <a href=${chuoi(`tel:${ctx.dienThoai.replace(/\s+/g, "")}`)} className="nut nut-chinh">${chu(`Gọi ${ctx.dienThoai}`)}</a>
          <a href="#lien-he" className="nut nut-phu">${chu("Để lại số")}</a>
        </div>`,
      ),
    );
  },
};

const daiAnhLon: KhoiMau = {
  ma: "dai-anh-lon",
  component: "DaiAnhLon",
  truong: [{ khoa: "dan", nhan: "Một câu dẫn (có thể bỏ trống)", kieu: "doan" }],
  sinh(nd, ctx) {
    // Không có ảnh thật thì KHÔNG dựng dải ảnh rỗng — bỏ hẳn khối, để trang
    // không có một mảng trống trơn mà người xem không hiểu là gì.
    if (ctx.anh.length === 0) {
      return tep("DaiAnhLon", `    <></>`);
    }
    return tep(
      "DaiAnhLon",
      `    <section className="vien-tren nhip">
      <div className="khung">
        ${layChu(nd, "dan", moTa(nd)) ? `<p className="chu-phu max-w-[60ch] leading-relaxed">${chu(layChu(nd, "dan", moTa(nd)))}</p>` : ""}
        <div className="mt-6 flex snap-x gap-4 overflow-x-auto pb-2">
${ctx.anh
  .slice(0, 8)
  .map(
    (a) => `          <img
            src=${chuoi(`/anh/${a.ten}`)}
            alt=${chuoi(a.alt)}
            loading="lazy"
            className="bo h-[16rem] w-auto max-w-[80vw] shrink-0 snap-start object-cover md:h-[22rem]"
          />`,
  )
  .join("\n")}
        </div>
      </div>
    </section>`,
    );
  },
};

const daiChuChay: KhoiMau = {
  ma: "marquee",
  component: "DaiChuChay",
  truong: [{ khoa: "muc", nhan: "Vài cụm chữ ngắn chạy ngang", kieu: "danh-sach", toiDa: 8 }],
  sinh(nd) {
    const muc = layDanhSach(nd, "muc", ["Giá thật", "Hồ sơ mở", "Không cam kết suông"]);
    return tep(
      "DaiChuChay",
      `    <section className="vien-tren overflow-hidden py-6">
      <div className="khung flex flex-wrap gap-x-8 gap-y-2 text-sm">
${muc.map((m) => `        <span className="chu-phu">${chu(m)}</span>`).join("\n")}
      </div>
    </section>`,
    );
  },
};

/* ──────────────────────────── Thẻ & danh sách ──────────────────────────── */

function theMuc(nd: NoiDungKhoi, khoa: string, duPhong: string): string {
  const muc = layMuc(nd, khoa, [{ tieuDe: duPhong, than: moTa(nd) }]);
  return `        <ul className="mt-8 grid gap-4 md:grid-cols-3">
${muc
  .map(
    (m) => `          <li className="the p-5">
            <p className="font-medium">${chu(m.tieuDe)}</p>
            <p className="chu-phu mt-2 text-sm leading-relaxed">${chu(m.than)}</p>
          </li>`,
  )
  .join("\n")}
        </ul>`;
}

const daiQuyetDinh: KhoiMau = {
  ma: "thanh-quyet-dinh",
  component: "DaiQuyetDinh",
  truong: [{ khoa: "muc", nhan: "3–4 câu hỏi người xem đang có", kieu: "muc", toiDa: 4 }],
  sinh(nd) {
    return tep("DaiQuyetDinh", mang("Bạn đang cần gì?", "", theMuc(nd, "muc", "Xem bảng giá")));
  },
};

const danhSachSanPham: KhoiMau = {
  ma: "danh-sach-san-pham",
  component: "DanhSachSanPham",
  truong: [
    { khoa: "tieuDe", nhan: "Tiêu đề mảng", kieu: "chu" },
    { khoa: "dan", nhan: "Dẫn nhập", kieu: "doan" },
    { khoa: "muc", nhan: "Mỗi mục: tên sản phẩm/dịch vụ — một câu", kieu: "muc", toiDa: 8 },
  ],
  sinh(nd) {
    return tep(
      "DanhSachSanPham",
      mang(layChu(nd, "tieuDe", "Sản phẩm & dịch vụ"), layChu(nd, "dan", moTa(nd)), theMuc(nd, "muc", "Đang cập nhật")),
    );
  },
};

const doiNgu: KhoiMau = {
  ma: "doi-ngu-tu-van",
  component: "DoiNgu",
  truong: [
    { khoa: "dan", nhan: "Một câu về người phụ trách", kieu: "doan" },
    { khoa: "muc", nhan: "Mỗi mục: tên — vai trò", kieu: "muc", toiDa: 6 },
  ],
  sinh(nd) {
    return tep("DoiNgu", mang("Ai tư vấn cho bạn", layChu(nd, "dan", moTa(nd)), theMuc(nd, "muc", "Đang cập nhật")));
  },
};

const hoSoMinhBach: KhoiMau = {
  ma: "ho-so-minh-bach",
  component: "HoSoMinhBach",
  truong: [
    { khoa: "dan", nhan: "Một câu mở", kieu: "doan" },
    { khoa: "muc", nhan: "Mỗi mục: tên giấy tờ / dữ kiện — trạng thái", kieu: "muc", toiDa: 8 },
  ],
  sinh(nd) {
    const muc = layMuc(nd, "muc", [{ tieuDe: "Giấy tờ pháp lý", than: "Đang cập nhật" }]);
    return tep(
      "HoSoMinhBach",
      mang(
        "Hồ sơ mở",
        layChu(nd, "dan", moTa(nd)),
        `        <dl className="mt-8 grid gap-x-8 gap-y-4 md:grid-cols-2">
${muc
  .map(
    (m) => `          <div className="vien-tren pt-4">
            <dt className="text-sm font-medium">${chu(m.tieuDe)}</dt>
            <dd className="chu-phu mt-1 text-sm leading-relaxed">${chu(m.than)}</dd>
          </div>`,
  )
  .join("\n")}
        </dl>`,
      ),
    );
  },
};

const capNhatTienDo: KhoiMau = {
  ma: "cap-nhat-tien-do",
  component: "CapNhatTienDo",
  truong: [
    { khoa: "dan", nhan: "Một câu mở", kieu: "doan" },
    { khoa: "muc", nhan: "Mỗi mốc: thời điểm — việc đã xong", kieu: "muc", toiDa: 8 },
  ],
  sinh(nd) {
    const muc = layMuc(nd, "muc", [{ tieuDe: "Đang cập nhật", than: "" }]);
    return tep(
      "CapNhatTienDo",
      mang(
        "Cập nhật mới nhất",
        layChu(nd, "dan", moTa(nd)),
        `        <ol className="mt-8 flex flex-col gap-5">
${muc
  .map(
    (m) => `          <li className="grid gap-1 md:grid-cols-[10rem_1fr]">
            <span className="chu-nhan text-sm">${chu(m.tieuDe)}</span>
            <span className="text-sm leading-relaxed">${chu(m.than)}</span>
          </li>`,
  )
  .join("\n")}
        </ol>`,
      ),
    );
  },
};

const soDoKetNoi: KhoiMau = {
  ma: "so-do-ket-noi",
  component: "SoDoKetNoi",
  truong: [
    { khoa: "dan", nhan: "Một câu về vị trí", kieu: "doan" },
    { khoa: "muc", nhan: "Mỗi mục: địa điểm — khoảng cách/thời gian", kieu: "muc", toiDa: 8 },
  ],
  sinh(nd) {
    const muc = layMuc(nd, "muc", [{ tieuDe: "Trung tâm thành phố", than: "Đang cập nhật" }]);
    return tep(
      "SoDoKetNoi",
      mang(
        "Vị trí & kết nối",
        layChu(nd, "dan", moTa(nd)),
        `        <ul className="mt-8 grid gap-3 md:grid-cols-2">
${muc
  .map(
    (m) => `          <li className="the flex items-baseline justify-between gap-4 p-4">
            <span className="text-sm">${chu(m.tieuDe)}</span>
            <span className="chu-nhan text-sm">${chu(m.than)}</span>
          </li>`,
  )
  .join("\n")}
        </ul>`,
      ),
    );
  },
};

/* ─────────────────────────── Bảng & biểu đồ ────────────────────────────── */

function bangHaiCot(nd: NoiDungKhoi, cot: [string, string], duPhong: string): string {
  const muc = layMuc(nd, "muc", [{ tieuDe: moTa(nd) || duPhong, than: "—" }]);
  return `        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="vien-duoi text-left">
                <th className="chu-phu py-2 font-medium">${chu(cot[0])}</th>
                <th className="chu-phu py-2 text-right font-medium">${chu(cot[1])}</th>
              </tr>
            </thead>
            <tbody>
${muc
  .map(
    (m) => `              <tr className="vien-duoi">
                <td className="py-3">${chu(m.tieuDe)}</td>
                <td className="chu-nhan py-3 text-right">${chu(m.than)}</td>
              </tr>`,
  )
  .join("\n")}
            </tbody>
          </table>
        </div>`;
}

const giaThucTra: KhoiMau = {
  ma: "gia-thuc-tra",
  component: "GiaThucTra",
  truong: [
    { khoa: "dan", nhan: "Một câu nói rõ con số nào là thật", kieu: "doan" },
    { khoa: "muc", nhan: "Mỗi dòng: khoản — số tiền", kieu: "muc", toiDa: 10 },
  ],
  sinh(nd) {
    return tep(
      "GiaThucTra",
      mang("Giá thực trả", layChu(nd, "dan", moTa(nd)), bangHaiCot(nd, ["Khoản", "Số tiền"], "Đang cập nhật")),
    );
  },
};

const bangHang: KhoiMau = {
  ma: "bang-hang",
  component: "BangHang",
  truong: [
    { khoa: "dan", nhan: "Một câu về bảng hàng", kieu: "doan" },
    { khoa: "muc", nhan: "Mỗi dòng: mã căn/loại — giá hoặc trạng thái", kieu: "muc", toiDa: 20 },
  ],
  sinh(nd) {
    return tep(
      "BangHang",
      mang("Đang mở bán", layChu(nd, "dan", moTa(nd)), bangHaiCot(nd, ["Căn / loại", "Giá"], "Đang cập nhật")),
    );
  },
};

const bangSoSanh: KhoiMau = {
  ma: "bang-so-sanh",
  component: "BangSoSanh",
  truong: [
    { khoa: "dan", nhan: "Một câu về việc so gì với gì", kieu: "doan" },
    { khoa: "muc", nhan: "Mỗi dòng: tiêu chí — kết quả so sánh", kieu: "muc", toiDa: 10 },
  ],
  sinh(nd) {
    return tep(
      "BangSoSanh",
      mang("So sánh", layChu(nd, "dan", moTa(nd)), bangHaiCot(nd, ["Tiêu chí", "Kết quả"], "Đang cập nhật")),
    );
  },
};

const bieuDoTienIch: KhoiMau = {
  ma: "bieu-do-tien-ich",
  component: "BieuDoTienIch",
  truong: [
    { khoa: "dan", nhan: "Một câu mở", kieu: "doan" },
    { khoa: "muc", nhan: "Mỗi mục: hạng mục — số (chỉ chữ số, cùng đơn vị)", kieu: "muc", toiDa: 8 },
  ],
  sinh(nd) {
    const muc = layMuc(nd, "muc", [{ tieuDe: "Đang cập nhật", than: "0" }]);
    const so = muc.map((m) => Number(String(m.than).replace(/[^\d.]/g, "")) || 0);
    const lonNhat = Math.max(1, ...so);
    return tep(
      "BieuDoTienIch",
      mang(
        "Quy mô các hạng mục",
        layChu(nd, "dan", moTa(nd)),
        `        <ul className="mt-8 flex flex-col gap-4">
${muc
  .map(
    (m, i) => `          <li>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span>${chu(m.tieuDe)}</span>
              <span className="chu-nhan">${chu(m.than)}</span>
            </div>
            <div className="thanh mt-2"><span className="thanh-trong" style={{ width: ${chuoi(`${Math.round((so[i]! / lonNhat) * 100)}%`)} }} /></div>
          </li>`,
  )
  .join("\n")}
        </ul>`,
      ),
    );
  },
};

/* ─────────────────────────── Hỏi đáp & biểu mẫu ────────────────────────── */

const cauHoiThuongGap: KhoiMau = {
  ma: "cau-hoi-thuong-gap",
  component: "CauHoiThuongGap",
  truong: [
    { khoa: "dan", nhan: "Một câu mở", kieu: "doan" },
    { khoa: "muc", nhan: "Mỗi mục: câu hỏi — câu trả lời thẳng", kieu: "muc", toiDa: 10 },
  ],
  sinh(nd) {
    const muc = layMuc(nd, "muc", [{ tieuDe: "Liên hệ thế nào?", than: "Gọi hoặc để lại số, chúng tôi gọi lại." }]);
    // JSON-LD FAQ: Google và trợ lý AI đọc được phần hỏi–đáp mà không phải
    // đoán từ HTML. Dữ liệu nhúng qua JSON.stringify nên chữ có dấu nháy cũng
    // không phá cú pháp.
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: muc.map((m) => ({
        "@type": "Question",
        name: m.tieuDe,
        acceptedAnswer: { "@type": "Answer", text: m.than },
      })),
    };
    return tep(
      "CauHoiThuongGap",
      mang(
        "Câu hỏi thường gặp",
        layChu(nd, "dan", moTa(nd)),
        `        <div className="mt-8 flex flex-col gap-3">
${muc
  .map(
    (m) => `          <details className="the p-5">
            <summary className="cursor-pointer font-medium">${chu(m.tieuDe)}</summary>
            <p className="chu-phu mt-3 text-sm leading-relaxed">${chu(m.than)}</p>
          </details>`,
  )
  .join("\n")}
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ${chuoi(JSON.stringify(jsonLd))} }}
        />`,
      ),
    );
  },
};

const dangKyForm: KhoiMau = {
  ma: "dang-ky-form",
  component: "DangKyForm",
  truong: [
    { khoa: "tieuDe", nhan: "Tiêu đề biểu mẫu", kieu: "chu" },
    { khoa: "dan", nhan: "Một câu hứa rõ: ai gọi lại, khi nào", kieu: "doan" },
  ],
  sinh(nd) {
    return `"use client";

import { useState } from "react";

/**
 * Biểu mẫu để lại số.
 *
 * Gửi sang \`/api/lien-he\` của chính trang này. Tuyến đó chuyển tiếp tới
 * webhook đặt trong biến môi trường \`LEAD_WEBHOOK_URL\`; chưa đặt thì nó ghi
 * ra nhật ký máy chủ và VẪN trả về thành công — người để lại số không phải
 * chịu hậu quả của việc cấu hình chưa xong, nhưng chủ trang thấy cảnh báo
 * trong log.
 */
export default function DangKyForm() {
  const [trangThai, datTrangThai] = useState<"nhap" | "dang-gui" | "xong" | "hong">("nhap");

  async function gui(su: React.FormEvent<HTMLFormElement>) {
    su.preventDefault();
    const du = new FormData(su.currentTarget);
    datTrangThai("dang-gui");
    try {
      const dap = await fetch("/api/lien-he", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ten: String(du.get("ten") ?? ""),
          dienThoai: String(du.get("dienThoai") ?? ""),
          nhuCau: String(du.get("nhuCau") ?? ""),
        }),
      });
      datTrangThai(dap.ok ? "xong" : "hong");
    } catch {
      datTrangThai("hong");
    }
  }

  return (
    <section id="lien-he" className="vien-tren nhip">
      <div className="khung max-w-[46rem]">
        <h2 className="tieu-de text-3xl leading-tight md:text-4xl">${chu(layChu(nd, "tieuDe", "Để lại số, chúng tôi gọi lại"))}</h2>
        <p className="chu-phu mt-4 leading-relaxed">${chu(layChu(nd, "dan", moTa(nd)))}</p>
        {trangThai === "xong" ? (
          <p role="status" className="the mt-8 p-5">
            Đã nhận. Chúng tôi gọi lại trong giờ làm việc.
          </p>
        ) : (
          <form onSubmit={gui} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm">
              Họ tên
              <input name="ten" required maxLength={120} className="o-nhap" />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Số điện thoại
              <input
                name="dienThoai"
                required
                inputMode="tel"
                pattern="[0-9+ ().-]{8,20}"
                className="o-nhap"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Bạn đang cần gì? (không bắt buộc)
              <textarea name="nhuCau" rows={3} maxLength={1000} className="o-nhap" />
            </label>
            <button type="submit" disabled={trangThai === "dang-gui"} className="nut nut-chinh self-start">
              {trangThai === "dang-gui" ? "Đang gửi…" : "Gửi"}
            </button>
            {trangThai === "hong" ? (
              <p role="alert" className="chu-canh text-sm">
                Không gửi được. Gọi trực tiếp giúp chúng tôi nhé.
              </p>
            ) : null}
          </form>
        )}
      </div>
    </section>
  );
}
`;
  },
};

/* ────────────────────── Dữ liệu có cấu trúc (SEO) ─────────────────────── */

const duLieuCoCauTruc: KhoiMau = {
  ma: "du-lieu-co-cau-truc",
  component: "DuLieuCoCauTruc",
  truong: [
    { khoa: "loaiHinh", nhan: "Loại hình (một–hai từ)", kieu: "chu", goiY: "Ví dụ: phòng khám nha khoa, sàn bất động sản, quán cà phê" },
    { khoa: "diaChi", nhan: "Địa chỉ (nếu chủ website có cho)", kieu: "chu" },
    { khoa: "gioMo", nhan: "Giờ mở cửa (nếu có)", kieu: "chu" },
  ],
  sinh(nd, ctx) {
    // JSON-LD LocalBusiness: Google và trợ lý AI đọc cái này để biết đây là
    // một cơ sở có thật, ở đâu, gọi số nào. Rẻ, và là thứ hầu hết trang tự
    // làm đều thiếu.
    //
    // Chỉ ghi trường nào CÓ THẬT. Bịa địa chỉ vào dữ liệu có cấu trúc còn tệ
    // hơn bịa trong chữ: máy đọc nó như một khẳng định chắc chắn.
    const diaChi = layChu(nd, "diaChi", "");
    const gioMo = layChu(nd, "gioMo", "");
    const du: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: ctx.tenWebsite,
      telephone: ctx.dienThoai,
    };
    const loaiHinh = layChu(nd, "loaiHinh", "");
    if (loaiHinh) du.description = loaiHinh;
    if (diaChi) du.address = { "@type": "PostalAddress", streetAddress: diaChi };
    if (gioMo) du.openingHours = gioMo;
    return `export default function DuLieuCoCauTruc() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: ${chuoi(JSON.stringify(du))} }}
    />
  );
}
`;
  },
};

const mocUuDai: KhoiMau = {
  ma: "moc-voucher",
  component: "MocUuDai",
  truong: [
    { khoa: "tieuDe", nhan: "Lý do nên liên hệ NGAY", kieu: "chu", goiY: "Ưu đãi, suất giữ chỗ, lịch trống — chỉ nói thứ CÓ THẬT" },
    { khoa: "dan", nhan: "Một câu giải thích", kieu: "doan" },
    { khoa: "nut", nhan: "Chữ trên nút", kieu: "chu" },
  ],
  sinh(nd, ctx) {
    return tep(
      "MocUuDai",
      `    <section className="nen-nhe vien-tren py-10">
      <div className="khung flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="tieu-de text-2xl leading-snug">${chu(layChu(nd, "tieuDe", "Còn suất tư vấn trong hôm nay"))}</p>
          <p className="chu-phu mt-2 max-w-[60ch] text-sm leading-relaxed">${chu(layChu(nd, "dan", moTa(nd)))}</p>
        </div>
        <a href=${chuoi(`tel:${ctx.dienThoai.replace(/\s+/g, "")}`)} className="nut nut-chinh">${chu(layChu(nd, "nut", `Gọi ${ctx.dienThoai}`))}</a>
      </div>
    </section>`,
    );
  },
};

const phanTichKhu: KhoiMau = {
  ma: "phan-tich-phan-khu",
  component: "PhanTichKhu",
  truong: [
    { khoa: "dan", nhan: "Một câu mở", kieu: "doan" },
    { khoa: "muc", nhan: "Mỗi khu: tên — ai nên chọn, vì sao", kieu: "muc", toiDa: 8 },
  ],
  sinh(nd) {
    const muc = layMuc(nd, "muc", [{ tieuDe: "Đang cập nhật", than: moTa(nd) }]);
    return tep(
      "PhanTichKhu",
      mang(
        "Từng khu hợp với ai",
        layChu(nd, "dan", moTa(nd)),
        `        <div className="mt-8 grid gap-5 md:grid-cols-2">
${muc
  .map(
    (m) => `          <div className="the p-5">
            <p className="tieu-de text-xl">${chu(m.tieuDe)}</p>
            <p className="chu-phu mt-2 text-sm leading-relaxed">${chu(m.than)}</p>
          </div>`,
  )
  .join("\n")}
        </div>`,
      ),
    );
  },
};

const quyCanXemTruoc: KhoiMau = {
  ma: "quy-can-xem-truoc",
  component: "QuyCanXemTruoc",
  truong: [
    { khoa: "dan", nhan: "Một câu về quỹ hàng", kieu: "doan" },
    { khoa: "muc", nhan: "Vài căn nổi bật: mã/loại — giá hoặc trạng thái", kieu: "muc", toiDa: 6 },
  ],
  sinh(nd) {
    return tep(
      "QuyCanXemTruoc",
      mang("Vài căn đang mở", layChu(nd, "dan", moTa(nd)), bangHaiCot(nd, ["Căn / loại", "Giá"], "Đang cập nhật")),
    );
  },
};

/* ──────────────────────────────── Sổ tra ───────────────────────────────── */

export const MAU_KHOI: readonly KhoiMau[] = [
  daiAnhLon,
  dauTrang,
  chanTrang,
  lienHeNoi,
  moDau,
  khoiChot,
  daiChuChay,
  daiQuyetDinh,
  danhSachSanPham,
  doiNgu,
  hoSoMinhBach,
  capNhatTienDo,
  soDoKetNoi,
  giaThucTra,
  bangHang,
  bangSoSanh,
  bieuDoTienIch,
  cauHoiThuongGap,
  dangKyForm,
  duLieuCoCauTruc,
  mocUuDai,
  phanTichKhu,
  quyCanXemTruoc,
];

const THEO_MA = new Map(MAU_KHOI.map((k) => [k.ma, k]));

export function timMauKhoi(ma: string): KhoiMau | null {
  return THEO_MA.get(ma.trim().toLowerCase()) ?? null;
}

export function coMauKhoi(ma: string): boolean {
  return THEO_MA.has(ma.trim().toLowerCase());
}

export type { BoiCanhSinh, KhoiMau, NoiDungKhoi };

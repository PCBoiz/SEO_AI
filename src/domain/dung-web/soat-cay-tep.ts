import type { CayTep } from "./moi-truong-dung";

/**
 * SOÁT CÂY TỆP TRƯỚC KHI GIAO — những lỗi `next build` không bao giờ bắt.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * `tsc` + `next build` chỉ nói "mã chạy được". Chúng không nói: trang có tiêu
 * đề cấp một không, ảnh có chữ thay thế không, thẻ mô tả có rỗng không, có
 * chuỗi "undefined" nào lọt vào chữ không. Đó đúng là những thứ khách nhìn
 * thấy hoặc Google nhìn thấy, và là những thứ dễ vỡ nhất mỗi khi thêm khuôn
 * khối mới.
 *
 * Hàm thuần, chạy trong vài mili giây, nên gọi được ở mọi chỗ: kịch bản dựng
 * thử, test, và (sau này) ngay trước khi cho tải .zip.
 *
 * Mỗi luật ở đây sinh ra từ một lỗi có thật hoặc một hậu quả cụ thể — không
 * có luật nào kiểu "cho đẹp".
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface LoiSoat {
  tep: string;
  loi: string;
  /** `nang` = không nên giao; `nhe` = nên sửa nhưng không chặn. */
  muc: "nang" | "nhe";
  /** Mã luật ổn định — nơi khác lọc theo mã này, không theo câu chữ. */
  ma?: "so-giu-cho" | "ten-mien";
}

const laTrang = (d: string) => d.startsWith("src/app/") && d.endsWith("/page.tsx");
const laKhoi = (d: string) => d.startsWith("src/components/khoi/");

function demChuoi(van: string, mau: RegExp): number {
  return van.match(mau)?.length ?? 0;
}

export function soatCayTep(cay: CayTep): LoiSoat[] {
  const loi: LoiSoat[] = [];
  const chu = (d: string): string => {
    const t = cay.tep.find((x) => x.duongDan === d);
    return typeof t?.noiDung === "string" ? t.noiDung : "";
  };
  const duongDan = cay.tep.map((t) => t.duongDan);

  // Gom chữ của cả trang: trang nhập khối nào thì tính cả khối đó, vì `<h1>`
  // thường nằm trong khối chứ không nằm ở tệp trang.
  const khoiCuaTrang = (vanTrang: string): string[] =>
    [...vanTrang.matchAll(/from "@\/components\/khoi\/([a-z0-9-]+)"/g)].map((m) => `src/components/khoi/${m[1]}.tsx`);

  const khoiChungTrongLayout = khoiCuaTrang(chu("src/app/layout.tsx"));
  for (const m of chu("src/app/layout.tsx").matchAll(/^import (\w+) from "@\/components\/khoi\/[a-z0-9-]+";/gm)) {
    if (!new RegExp(`<${m[1]!}\\s*/?>`).test(chu("src/app/layout.tsx"))) {
      loi.push({ tep: "src/app/layout.tsx", loi: `nhập khối ${m[1]} mà không vẽ`, muc: "nang" });
    }
  }

  for (const d of duongDan.filter(laTrang)) {
    const van = chu(d);
    const cacKhoi = [...khoiCuaTrang(van), ...khoiChungTrongLayout];
    const gop = van + cacKhoi.map(chu).join("\n");

    // 1. ĐÚNG MỘT <h1>. Không có: Google và người đọc không biết trang nói gì.
    //    Nhiều hơn một: cấu trúc tiêu đề vô nghĩa, và trình đọc màn hình lạc.
    const soH1 = demChuoi(gop, /<h1[\s>]/g);
    if (soH1 !== 1) loi.push({ tep: d, loi: `có ${soH1} thẻ <h1> (phải đúng 1)`, muc: "nang" });

    // 1b. Khối nhập vào mà không vẽ: mã vẫn biên dịch, nhưng khối đó biến mất
    //     khỏi trang — JSON-LD doanh nghiệp từng mất đúng kiểu này (13/09).
    for (const m of van.matchAll(/^import (\w+) from "@\/components\/khoi\/[a-z0-9-]+";/gm)) {
      if (!new RegExp(`<${m[1]!}\\s*/?>`).test(van)) loi.push({ tep: d, loi: `nhập khối ${m[1]} mà không vẽ`, muc: "nang" });
    }

    // 2. Tiêu đề + mô tả cho thẻ meta.
    if (!/export const metadata/.test(van)) loi.push({ tep: d, loi: "thiếu `export const metadata`", muc: "nang" });
    if (/description: ""/.test(van)) loi.push({ tep: d, loi: "mô tả trang rỗng", muc: "nhe" });
  }

  for (const d of duongDan.filter((x) => laKhoi(x) || laTrang(x) || x === "src/app/layout.tsx" || x === "src/app/not-found.tsx")) {
    const van = chu(d);

    // 3. Ảnh phải có alt KHÔNG rỗng — ảnh không alt là ảnh vô hình với người
    //    khiếm thị và với Google.
    for (const the of van.match(/<img[^>]*>/g) ?? []) {
      if (!/\balt=/.test(the)) loi.push({ tep: d, loi: "thẻ <img> thiếu alt", muc: "nang" });
      else if (/\balt=""/.test(the)) loi.push({ tep: d, loi: "thẻ <img> có alt rỗng", muc: "nhe" });
    }

    // 4. Chữ "undefined"/"null" lọt vào nội dung: dấu hiệu một ô chữ bị thiếu
    //    mà khuôn vẫn in ra. Trông như lỗi lập trình ngay trên trang khách.
    if (/>\{?"(undefined|null)"/.test(van) || /\{"(undefined|null)"\}/.test(van)) {
      loi.push({ tep: d, loi: 'có chữ "undefined"/"null" trong nội dung', muc: "nang" });
    }

    // 5. Liên kết trống `href="#"`: nút bấm không đi đâu cả.
    if (/href="#"/.test(van)) loi.push({ tep: d, loi: 'có liên kết trống href="#"', muc: "nang" });

    // 6. JSON-LD phải parse được — dữ liệu có cấu trúc hỏng thì Google bỏ qua
    //    im lặng, không ai biết.
    for (const m of van.matchAll(/__html: ("(?:[^"\\]|\\.)*")/g)) {
      try {
        JSON.parse(JSON.parse(m[1]!) as string);
      } catch {
        loi.push({ tep: d, loi: "JSON-LD không parse được", muc: "nang" });
      }
    }
  }

  // 7. Khung dự án: thiếu một trong những tệp này là dự án không chạy — hoặc
  //    chạy mà trông như chưa xong (không icon, 404 tiếng Anh, không thẻ chia sẻ).
  for (const can of [
    "package.json",
    "tsconfig.json",
    "next-env.d.ts",
    "src/app/layout.tsx",
    "src/app/globals.css",
    "src/lib/thong-tin.ts",
    "src/lib/meta.ts",
    "src/app/icon.svg",
    "src/app/not-found.tsx",
  ]) {
    if (!duongDan.includes(can)) loi.push({ tep: can, loi: "thiếu tệp bắt buộc", muc: "nang" });
  }

  // 10. Số điện thoại/tên chỉ được nằm ở MỘT chỗ (`src/lib/thong-tin.ts`).
  //     Khối nào gõ thẳng `tel:` là khối đó sẽ giữ số cũ khi chủ website đổi số.
  for (const d of duongDan.filter((x) => laKhoi(x) || laTrang(x) || x === "src/app/layout.tsx" || x === "src/app/not-found.tsx")) {
    if (/href="tel:/.test(chu(d))) loi.push({ tep: d, loi: "số điện thoại gõ thẳng vào khối — phải qua LINK_GOI của thong-tin.ts", muc: "nang" });
  }

  // 8. Biến thiết kế: khối nào cũng dựa vào chúng.
  const css = chu("src/app/globals.css");
  for (const bien of ["--nen", "--chu", "--nhan", "--phu", "--nhip", "--bo"]) {
    if (!css.includes(`${bien}:`)) loi.push({ tep: "src/app/globals.css", loi: `thiếu biến ${bien}`, muc: "nang" });
  }

  // 9. Số điện thoại thật: số giữ chỗ lọt vào thong-tin.ts nghĩa là khách bấm
  //    gọi vào hư không.
  const tatCa = cay.tep.map((t) => (typeof t.noiDung === "string" ? t.noiDung : "")).join("\n");
  if (/tel:0{6,}|dienThoai:"0{6,}/.test(tatCa.replace(/\s/g, ""))) {
    loi.push({ tep: "(toàn bộ)", loi: "số điện thoại giữ chỗ (0000…) còn trong mã", muc: "nang", ma: "so-giu-cho" });
  }

  // 11. Tên miền giữ chỗ: dự án chưa có URL website → canonical, sitemap và
  //     thẻ chia sẻ trỏ vào example.com. Trang vẫn chạy nên chỉ nhắc (nhẹ).
  if (/diaChi:\s*"https:\/\/example\.com"/.test(chu("src/lib/thong-tin.ts"))) {
    loi.push({ tep: "src/lib/thong-tin.ts", loi: "chưa có tên miền — sitemap và thẻ chia sẻ đang trỏ example.com (điền URL website của dự án)", muc: "nhe", ma: "ten-mien" });
  }

  // 12. Font tự lưu: mọi tệp /fonts/… mà CSS hay thẻ preload nhắc tới phải có
  //     trong cây — thiếu là chữ rơi về font hệ thống mà không ai báo.
  const fontNhacToi = new Set(
    [...[css, chu("src/app/layout.tsx"), chu("src/components/tai-truoc-font.tsx")].join("\n").matchAll(/\/fonts\/([A-Za-z0-9._-]+\.woff2)/g)].map((m) => m[1]!),
  );
  for (const ten of fontNhacToi) {
    if (!duongDan.includes(`public/fonts/${ten}`)) loi.push({ tep: "public/fonts", loi: `thiếu tệp font ${ten}`, muc: "nang" });
  }

  return loi;
}

export function tomTatSoat(loi: readonly LoiSoat[]): string {
  if (loi.length === 0) return "✓ Soát cây tệp: không có lỗi.";
  const nang = loi.filter((l) => l.muc === "nang");
  return [
    `${nang.length} lỗi nặng, ${loi.length - nang.length} lỗi nhẹ:`,
    ...loi.map((l) => `  ${l.muc === "nang" ? "✗" : "·"} ${l.tep}: ${l.loi}`),
  ].join("\n");
}

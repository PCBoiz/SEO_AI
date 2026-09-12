/**
 * BẤM THỬ web mẫu ĐANG CHẠY — chứng minh phần đếm khách liên hệ chạy đúng, mà
 * Google không nhận được gì.
 *
 * Chạy (web mẫu phải đang chạy: `next start`, `next dev` hoặc `wrangler dev`):
 *   npm run dung-web:bam-thu -- http://127.0.0.1:3141 co-ga
 *   npm run dung-web:bam-thu -- http://127.0.0.1:3142 khong-ga
 *
 * `co-ga`: web dựng với NEXT_PUBLIC_GA_ID (ví dụ `G-THU0000000`, dựng bằng
 * `NEXT_PUBLIC_GA_ID=G-THU0000000 npm run dung-web:thu`). `khong-ga`: dựng
 * không có mã.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO CẦN, KHI ĐÃ CÓ TEST ĐƠN VỊ
 *
 * Test đơn vị chỉ ĐỌC mã sinh ra, không chạy nó. Vòng 74 (13/09) bản nháp của
 * kịch bản này bắt được một lỗi không phép thử nào thấy: `pattern` của ô số
 * điện thoại dịch hỏng với cờ "v" của Chromium, nên trình duyệt âm thầm bỏ kiểm
 * tra. Lỗi chỉ hiện khi gõ vào ô — Lighthouse cũng không bắt.
 *
 * Mọi yêu cầu ra ngoài máy bị CHẶN (kể cả gtag.js), và tuyến `/api/lien-he` bị
 * thay bằng câu trả lời giả: không lượt đếm nào tới Google, không khách giả nào
 * tới bảng tính thật. Kịch bản đọc thẳng hàng đợi `window.dataLayer`.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { chromium, type Browser, type Page, type Route } from "@playwright/test";

const GOC = (process.argv[2] ?? "").replace(/\/+$/, "");
const CHE_DO = process.argv[3];
if (!GOC || (CHE_DO !== "co-ga" && CHE_DO !== "khong-ga")) {
  console.error("Cách chạy: npm run dung-web:bam-thu -- <địa chỉ web mẫu> <co-ga|khong-ga>");
  process.exit(2);
}
const CO_GA = CHE_DO === "co-ga";

/** Một lệnh trong hàng đợi, đọc ra dạng thường để so. */
interface Lenh {
  kieu: string;
  lenh: unknown[];
}

const hong: string[] = [];
const raNgoai = new Set<string>();
const loiConsole: string[] = [];

function kiem(dat: boolean, moTa: string): void {
  console.log(`${dat ? "✓" : "✗"} ${moTa}`);
  if (!dat) hong.push(moTa);
}

async function moTrang(trinh: Browser, tuyenLienHe: (r: Route) => Promise<void>): Promise<Page> {
  const ngu = await trinh.newContext({ viewport: { width: 1280, height: 900 } });
  await ngu.route("**/*", (r) => {
    const u = new URL(r.request().url());
    if (u.hostname !== "127.0.0.1" && u.hostname !== "localhost") {
      raNgoai.add(u.hostname + u.pathname);
      return r.abort();
    }
    return u.pathname === "/api/lien-he" ? tuyenLienHe(r) : r.continue();
  });
  const trang = await ngu.newPage();
  trang.on("console", (m) => {
    if (m.type() === "error") loiConsole.push(m.text());
  });
  trang.on("pageerror", (e) => loiConsole.push(`pageerror: ${e.message}`));
  await trang.goto(`${GOC}/`, { waitUntil: "networkidle" });
  return trang;
}

// Hàm truyền vào `evaluate` chỉ dùng hàm vô danh: tsx giữ tên hàm bằng một hàm
// phụ không có trong trình duyệt.
function docHang(trang: Page): Promise<Lenh[] | null> {
  return trang.evaluate(() => {
    const w = window as unknown as { dataLayer?: ArrayLike<unknown>[] };
    return w.dataLayer === undefined
      ? null
      : w.dataLayer.map((a) => ({
          kieu: Object.prototype.toString.call(a),
          lenh: Array.from(a).map((x) => (x instanceof Date ? "<Date>" : x)),
        }));
  });
}

async function guiBieuMau(trang: Page, cho: string): Promise<void> {
  await trang.fill('input[name="ten"]', "Khach Thu");
  await trang.fill('input[name="dienThoai"]', "0900 000 001");
  await trang.locator('form button[type="submit"]').click();
  // Chỉ thẻ của biểu mẫu: Next có sẵn một thẻ role="alert" (route announcer).
  await trang.locator(cho).waitFor({ timeout: 20_000 });
}

async function main(): Promise<void> {
  const trinh = await chromium.launch();
  try {
    const dat = (r: Route) => r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    const trang = await moTrang(trinh, dat);

    // 1. Lúc tải.
    const lucTai = await docHang(trang);
    if (CO_GA) {
      kiem(
        lucTai?.length === 2 &&
          lucTai[0]!.lenh[0] === "js" &&
          lucTai[1]!.lenh[0] === "config" &&
          String(lucTai[1]!.lenh[1]).startsWith("G-"),
        'lúc tải: hàng đợi có "js" rồi "config" (config đi trước mọi sự kiện)',
      );
    } else {
      kiem(lucTai === null, "lúc tải: không có hàng đợi dataLayer");
    }

    // 2. Ô số điện thoại THẬT SỰ được kiểm.
    const o = await trang.evaluate(() => {
      const oSo = document.querySelector<HTMLInputElement>('input[name="dienThoai"]');
      if (!oSo) return null;
      oSo.value = "abc";
      const nhanChuSai = oSo.checkValidity();
      oSo.value = "0900 000 001";
      const nhanSoDung = oSo.checkValidity();
      oSo.value = "";
      return { nhanChuSai, nhanSoDung };
    });
    kiem(o?.nhanChuSai === false && o?.nhanSoDung === true, 'ô số điện thoại từ chối "abc", nhận "0900 000 001"');

    // 3. Bấm gọi / Zalo ở từng chỗ. Chặn điều hướng SAU bộ đếm: cùng pha capture,
    //    gắn sau thì chạy sau — bộ đếm vẫn thấy lượt bấm.
    await trang.evaluate(() => {
      document.addEventListener(
        "click",
        (e) => {
          if (e.target instanceof Element && e.target.closest("a[href]")) e.preventDefault();
        },
        { capture: true },
      );
    });
    const canBam: Array<[string, string, string]> = [
      ['[data-vi-tri="thanh-noi"] a[href^="tel:"]', "goi_dien", "thanh-noi"],
      ['[data-vi-tri="thanh-noi"] a[href*="zalo.me"]', "nhan_zalo", "thanh-noi"],
      ['footer a[href^="tel:"]', "goi_dien", "chan-trang"],
      ['header a[href^="tel:"]', "goi_dien", "dau-trang"],
      ['main a[href^="tel:"]', "goi_dien", "noi-dung"],
    ];
    const truocBam = (await docHang(trang))?.length ?? 0;
    const mongDoi: unknown[][] = [];
    for (const [boChon, suKien, viTri] of canBam) {
      const link = trang.locator(boChon).first();
      if ((await trang.locator(boChon).count()) === 0) {
        kiem(false, `web mẫu có link ${boChon}`);
        continue;
      }
      try {
        await link.click({ timeout: 5_000 });
      } catch {
        // Bị khối khác che (thanh nổi): bắn thẳng lượt bấm vào link.
        await link.dispatchEvent("click");
      }
      mongDoi.push(["event", suKien, { vi_tri: viTri }]);
    }
    if (CO_GA) {
      const sauBam = ((await docHang(trang)) ?? []).slice(truocBam);
      kiem(
        JSON.stringify(sauBam.map((l) => l.lenh)) === JSON.stringify(mongDoi),
        `${mongDoi.length} lượt bấm ra đúng ${mongDoi.length} sự kiện, đúng tên và vị trí`,
      );
      kiem(sauBam.length > 0 && sauBam.every((l) => l.kieu === "[object Arguments]"), 'lệnh vào hàng đợi dạng "arguments", như đoạn mã của Google');
    } else {
      kiem((await docHang(trang)) === null, "bấm gọi/Zalo: không đếm gì");
    }

    // 4. Biểu mẫu gửi được → generate_lead (chỉ khi có mã GA).
    const truocForm = (await docHang(trang))?.length ?? 0;
    await guiBieuMau(trang, 'p[role="status"]');
    const sauForm = ((await docHang(trang)) ?? []).slice(truocForm).map((l) => l.lenh);
    kiem(
      JSON.stringify(sauForm) === JSON.stringify(CO_GA ? [["event", "generate_lead", {}]] : []),
      CO_GA ? "gửi biểu mẫu đạt → generate_lead" : "gửi biểu mẫu đạt → không đếm gì",
    );

    // 5. Biểu mẫu gửi hỏng → không đếm.
    const trangHong = await moTrang(trinh, (r) => r.fulfill({ status: 500, body: "{}" }));
    const truocHong = (await docHang(trangHong))?.length ?? 0;
    await guiBieuMau(trangHong, 'form p[role="alert"]');
    const sauHong = ((await docHang(trangHong)) ?? []).slice(truocHong);
    kiem(sauHong.length === 0, "máy chủ trả lỗi → không đếm generate_lead");

    // 6. Không gì lọt ra ngoài, console sạch.
    const choPhep = CO_GA ? ["www.googletagmanager.com/gtag/js"] : [];
    const thay = [...raNgoai];
    kiem(
      thay.every((u) => choPhep.includes(u)) && (!CO_GA || raNgoai.has(choPhep[0]!)),
      `yêu cầu ra ngoài (đều đã chặn): mong ${choPhep.join(", ") || "không có"} — thấy ${thay.join(", ") || "không có"}`,
    );
    // Lỗi do chính kịch bản gây ra: gtag.js bị chặn, và câu trả lời 500 giả.
    const loiKhac = loiConsole.filter((t) => !/net::ERR_FAILED|status of 500/.test(t));
    kiem(loiKhac.length === 0, `console không có lỗi nào khác${loiKhac.length > 0 ? `: ${loiKhac.join(" | ")}` : ""}`);
  } finally {
    await trinh.close();
  }

  if (hong.length > 0) {
    console.error(`\nHỎNG ${hong.length} mục.`);
    process.exitCode = 1;
  } else {
    console.log("\nĐẠT tất cả.");
  }
}

void main();

// Audit giao diện Antigravity bằng trình duyệt thật.
//
// Ba phần, và phần thứ hai mới là phần quan trọng nhất:
//
//   1. ĐO KỸ THUẬT   — tràn ngang, tương phản, điểm chạm, thang chữ, bàn phím.
//   2. PHÉP THỬ NGƯỜI MỚI — đếm số lần bấm, số ô phải điền, số thuật ngữ kỹ
//      thuật gặp phải, từ lúc đăng nhập tới lúc đăng được một bài. Đây là thước
//      đo thật cho câu hỏi "người không biết lập trình dùng được không".
//   3. RÀ CHỮ        — mọi thuật ngữ kỹ thuật lọt ra màn hình.
//
//   node scripts/audit-giao-dien.mjs

import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const GOC = process.env.AUDIT_URL ?? "http://localhost:3002";
const THU_MUC = path.join(process.cwd(), ".audit");

const KHO_MAN = [
  { ten: "dt", rong: 390, cao: 844 },
  { ten: "pc", rong: 1440, cao: 900 },
];

const TRANG = [
  { ten: "bat-dau", duong: "/bat-dau" },
  { ten: "dashboard", duong: "/dashboard" },
  { ten: "projects", duong: "/projects" },
  { ten: "projects-new", duong: "/projects/new" },
  { ten: "pipelines", duong: "/pipelines" },
  { ten: "automations", duong: "/automations" },
  { ten: "automations-keywords", duong: "/automations/keywords" },
  { ten: "automations-sitemap", duong: "/automations/sitemap" },
  { ten: "run-module", duong: "/automations/run/RIS_CONTENT_HEADLINE" },
  { ten: "outputs", duong: "/outputs" },
  { ten: "analytics", duong: "/analytics" },
  { ten: "knowledge", duong: "/knowledge" },
  { ten: "ai-keys", duong: "/ai-keys" },
  { ten: "wordpress", duong: "/wordpress" },
  { ten: "settings", duong: "/settings" },
];

/**
 * Thuật ngữ KHÔNG được xuất hiện trước mắt người không biết lập trình.
 *
 * Danh sách này không phải để bắt lỗi chính tả — nó bắt những chỗ mà mô hình
 * dữ liệu bên trong bị rò ra giao diện. Mỗi từ ở đây là một chỗ người dùng phải
 * học khái niệm của lập trình viên mới dùng được phần mềm.
 */
const TU_KY_THUAT = [
  "module key", "moduleKey", "workspace", "RIS_", "llms.txt", "JSON-LD", "robots.txt", "On-Page", "payload", "schema", "adapter", "persistence",
  "endpoint", "webhook", "API key", "token", "slug", "JSON", "null",
  "undefined", "boolean", "enum", "async", "runtime", "deploy", "commit",
  "repository", "query", "cache", "cron", "OAuth", "bearer", "hash",
  "provider", "instance", "config", "env", "middleware", "SSR", "prompt",
];

function doTrangDOM(tuKyThuat) {
  const doRGB = (s) => {
    const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
    return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null;
  };
  const dophat = (c) => {
    const f = (v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const tyLe = (a, b) => {
    const la = dophat(a), lb = dophat(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const tron = (tren, duoi) => {
    const a = tren[3];
    return [
      tren[0] * a + duoi[0] * (1 - a),
      tren[1] * a + duoi[1] * (1 - a),
      tren[2] * a + duoi[2] * (1 - a), 1,
    ];
  };
  const nenThat = (el) => {
    const chong = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const bg = doRGB(getComputedStyle(n).backgroundColor);
      if (bg && bg[3] > 0) { chong.push(bg); if (bg[3] === 1) break; }
      n = n.parentElement;
    }
    // Nền gốc lấy từ chính <body> chứ không đoán — giao diện này có hai chủ đề
    // sáng/tối nên đoán một màu cố định là sai một nửa số lần.
    const goc = doRGB(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255, 1];
    let ket = [goc[0], goc[1], goc[2], 1];
    for (let i = chong.length - 1; i >= 0; i--) ket = tron(chong[i], ket);
    return ket;
  };
  const hienRa = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05;
  };

  const de = document.documentElement;
  const loiTuongPhan = [];
  const chuTrenTrang = [];
  let coNhoNhat = 999;

  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const daXet = new Set();
  for (let nut = w.nextNode(); nut; nut = w.nextNode()) {
    const chu = nut.textContent.trim();
    if (chu.length < 2) continue;
    const el = nut.parentElement;
    if (!el || !hienRa(el)) continue;
    if (el.closest(".sr-only, [aria-hidden='true'], script, style")) continue;

    chuTrenTrang.push(chu);
    const s = getComputedStyle(el);
    const co = parseFloat(s.fontSize);
    const dam = parseInt(s.fontWeight, 10) || 400;
    if (co < coNhoNhat) coNhoNhat = co;

    if (!daXet.has(el)) {
      daXet.add(el);
      const mau = doRGB(s.color);
      if (mau && mau[3] > 0) {
        const nen = nenThat(el);
        const t = tyLe(mau[3] < 1 ? tron(mau, nen) : mau, nen);
        const nguong = co >= 24 || (co >= 18.66 && dam >= 700) ? 3 : 4.5;
        if (t < nguong) {
          loiTuongPhan.push({ chu: chu.slice(0, 40), co: Math.round(co), ty: +t.toFixed(2), can: nguong });
        }
      }
    }
  }

  // ---- thuật ngữ kỹ thuật lọt ra màn hình ----------------------------------
  const toanBoChu = chuTrenTrang.join(" ");
  const tuLo = tuKyThuat.filter((t) =>
    new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(toanBoChu),
  );

  // ---- điểm chạm ----------------------------------------------------------
  const chamNho = [];
  for (const el of document.querySelectorAll("a,button,[role=button],input,select,textarea")) {
    if (!hienRa(el) || el.closest(".sr-only")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) {
      chamNho.push({
        the: el.tagName.toLowerCase(),
        chu: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 24),
        w: Math.round(r.width), h: Math.round(r.height),
      });
    }
  }

  // ---- ô nhập thiếu nhãn ---------------------------------------------------
  const oThieuNhan = [];
  for (const o of document.querySelectorAll("input, select, textarea")) {
    if (!hienRa(o) || o.type === "hidden") continue;
    if (!(o.labels?.length > 0 || o.getAttribute("aria-label") || o.getAttribute("aria-labelledby"))) {
      oThieuNhan.push({ the: o.tagName.toLowerCase(), ten: o.name || o.id || "(không tên)" });
    }
  }

  // ---- nút không có tên ----------------------------------------------------
  const nutKhongTen = [];
  for (const el of document.querySelectorAll("a[href], button")) {
    if (!hienRa(el) || el.getAttribute("aria-hidden") === "true") continue;
    const ten = (el.getAttribute("aria-label") || el.textContent || el.title || "").trim();
    if (!ten) nutKhongTen.push((el.className || "").toString().slice(0, 40));
  }

  const heading = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
    .filter(hienRa)
    .map((h) => +h.tagName[1]);
  const loiHeading = [];
  if (heading.filter((b) => b === 1).length !== 1) {
    loiHeading.push(`có ${heading.filter((b) => b === 1).length} thẻ h1`);
  }

  const thangChu = {};
  for (const el of document.querySelectorAll("body *")) {
    if (!hienRa(el)) continue;
    const co = Math.round(parseFloat(getComputedStyle(el).fontSize));
    thangChu[co] = (thangChu[co] ?? 0) + 1;
  }

  return {
    tranNgang: de.scrollWidth - de.clientWidth,
    caoTrang: de.scrollHeight,
    soLoiTuongPhan: loiTuongPhan.length,
    loiTuongPhan: loiTuongPhan.slice(0, 8),
    coChuNhoNhat: coNhoNhat === 999 ? null : +coNhoNhat.toFixed(1),
    soChamNho: chamNho.length,
    chamNho: chamNho.slice(0, 8),
    oThieuNhan,
    nutKhongTen: nutKhongTen.slice(0, 6),
    loiHeading,
    tuKyThuatLoRa: tuLo,
    soChuHienThi: chuTrenTrang.length,
    thangChu: Object.entries(thangChu).map(([c, n]) => [+c, n]).sort((a, b) => b[0] - a[0]).slice(0, 12),
  };
}

async function dangNhap(page) {
  const tho = await readFile(
    path.join(process.cwd(), ".data", "seed-credentials.json"),
    "utf8",
  );
  const du = JSON.parse(tho);
  const ds = Array.isArray(du) ? du : (du.accounts ?? []);
  const chu = ds.find((x) => x.role === "owner") ?? ds[0];

  await page.goto(`${GOC}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"], input[name="email"]', chu.email);
  await page.fill('input[type="password"], input[name="password"]', chu.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 180000 });
  return chu;
}

/**
 * PHÉP THỬ NGƯỜI MỚI.
 *
 * Không đo "trang có đẹp không" mà đo "đi từ đầu tới cuối mất bao nhiêu công".
 * Đếm trên đường đi tới màn chạy module viết bài:
 *   · số lần phải bấm
 *   · số ô phải tự điền
 *   · số thuật ngữ kỹ thuật đập vào mắt
 *   · số chỗ có thể bế tắc (nút bị khoá mà không nói vì sao)
 */
async function thuNguoiMoi(page) {
  const buoc = [];
  const ghi = (ten, so) => buoc.push({ ten, ...so });

  // ĐI ĐÚNG ĐƯỜNG CỦA CHẾ ĐỘ ĐƠN GIẢN. Bản đầu đo /dashboard và /automations —
  // đó là màn hình của bản ĐẦY ĐỦ, nên số đo không nói gì về trải nghiệm của
  // người không biết lập trình.
  await page.goto(`${GOC}/bat-dau`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  let d = await page.evaluate(() => ({
    nut: [...document.querySelectorAll("a[href], button")].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }).length,
    o: document.querySelectorAll("input:not([type=hidden]), textarea, select").length,
  }));
  ghi("Màn hình đầu tiên sau đăng nhập", { soLuaChon: d.nut, soODien: d.o });

  await page.goto(`${GOC}/bat-dau`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  d = await page.evaluate(() => ({
    nut: [...document.querySelectorAll("a[href], button")].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }).length,
    o: document.querySelectorAll("input:not([type=hidden]), textarea, select").length,
  }));
  ghi("Trang chọn việc (bản đơn giản)", { soLuaChon: d.nut, soODien: d.o });

  await page.goto(`${GOC}/automations/run/RIS_CONTENT_HEADLINE`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1500);
  const manChay = await page.evaluate(() => {
    const oNhap = [...document.querySelectorAll("input:not([type=hidden]), textarea, select")]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
    const batBuoc = oNhap.filter((e) => e.required || e.getAttribute("aria-required") === "true");
    const nutKhoa = [...document.querySelectorAll("button")].filter((b) => b.disabled);
    return {
      soODien: oNhap.length,
      soOBatBuoc: batBuoc.length,
      nhanCacO: oNhap.map((e) => {
        const l = e.labels?.[0]?.textContent?.trim();
        return (l || e.getAttribute("aria-label") || e.placeholder || e.name || "(không nhãn)").slice(0, 40);
      }),
      soNutBiKhoa: nutKhoa.length,
      nutBiKhoa: nutKhoa.map((b) => (b.textContent || "").trim().slice(0, 30)),
      // Nút bị khoá mà không có lời giải thích nào cạnh đó = ngõ cụt.
      khoaKhongGiaiThich: nutKhoa.filter((b) => {
        const cha = b.closest("div, section, form");
        const chu = (cha?.textContent || "").toLowerCase();
        return !/cần|thiếu|chưa|trước|vui lòng|hãy|phải/.test(chu);
      }).length,
    };
  });
  ghi("Màn chạy việc", manChay);

  return buoc;
}

async function chay() {
  await mkdir(THU_MUC, { recursive: true });
  const trinh = await chromium.launch({ channel: "chrome" });
  const bao = [];

  for (const kho of KHO_MAN) {
    const ctx = await trinh.newContext({
      viewport: { width: kho.rong, height: kho.cao },
      locale: "vi-VN",
      reducedMotion: "no-preference",
    });
    ctx.setDefaultNavigationTimeout(180000);
    ctx.setDefaultTimeout(180000);
    const page = await ctx.newPage();
    const loiConsole = [];
    page.on("console", (m) => {
      if (m.type() === "error") loiConsole.push(m.text().slice(0, 100));
    });
    page.on("pageerror", (e) => loiConsole.push(`pageerror: ${e.message.slice(0, 100)}`));

    await dangNhap(page);

    for (const t of TRANG) {
      loiConsole.length = 0;
      try {
        await page.goto(GOC + t.duong, { waitUntil: "domcontentloaded", timeout: 180000 });
      } catch (e) {
        bao.push({ trang: t.ten, kho: kho.ten, loi: String(e).slice(0, 90) });
        continue;
      }
      await page.waitForTimeout(1400);
      const so = await page.evaluate(doTrangDOM, TU_KY_THUAT);
      bao.push({ trang: t.ten, kho: kho.ten, loiConsole: [...loiConsole], ...so });
      await page.screenshot({
        path: path.join(THU_MUC, `ag-${t.ten}--${kho.ten}.png`),
        fullPage: true,
      });
      process.stdout.write(`✓ ${t.ten} @ ${kho.ten}\n`);
    }
    await ctx.close();
  }

  // ---- phép thử người mới, chỉ chạy ở khổ máy bàn -------------------------
  const ctx = await trinh.newContext({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  ctx.setDefaultNavigationTimeout(180000);
    ctx.setDefaultTimeout(180000);
    const page = await ctx.newPage();
  await dangNhap(page);
  const nguoiMoi = await thuNguoiMoi(page);
  await ctx.close();

  await trinh.close();
  await writeFile(
    path.join(THU_MUC, "bao-cao-giao-dien.json"),
    JSON.stringify({ trang: bao, nguoiMoi }, null, 2),
    "utf8",
  );
  process.stdout.write(`\nBáo cáo: .audit/bao-cao-giao-dien.json\n`);
}

chay().catch((e) => {
  console.error(e);
  process.exit(1);
});

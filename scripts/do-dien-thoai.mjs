// Bộ đo giao diện Antigravity trên ĐIỆN THOẠI.
//
// ═══════════════════════════════════════════════════════════════════════════
// KHÁC BỘ ĐO CỦA TRANG BÁN HÀNG Ở MỘT ĐIỀU: PHẢI ĐĂNG NHẬP TRƯỚC.
//
// Antigravity nằm sau hàng rào đăng nhập, nên mở thẳng địa chỉ chỉ ra trang
// login. Bộ đo nào không đăng nhập sẽ đo mười bốn lần cùng một trang login rồi
// báo "sạch" — kiểu hỏng tệ nhất, vì nó cho ra một bản báo cáo trông rất đẹp.
//
// Cách chạy:
//   npm run dev                       (cửa sổ khác)
//   npx tsx scripts/do-dien-thoai.ts
// ═══════════════════════════════════════════════════════════════════════════

import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const GOC = process.env.DO_URL ?? "http://localhost:3000";
const THU_MUC = path.join(process.cwd(), ".do-dt");

/** Khổ máy. 360px là máy Android phổ thông ở Việt Nam; 320px là iPhone SE. */
const KHO = [
  { ten: "320", rong: 320, cao: 568 },
  { ten: "360", rong: 360, cao: 800 },
  { ten: "390", rong: 390, cao: 844 },
];

/**
 * Màn hình đem đo, kèm ĐỘ ƯU TIÊN.
 *
 * Chủ dự án đã chốt: phần DUYỆT BÀI và THEO DÕI TIẾN TRÌNH làm trước, phần
 * khách tự tạo nội dung làm sau. Cột `uuTien` giữ đúng thứ tự đó trong báo cáo
 * để không ai vô tình sửa màn hình ít quan trọng trước.
 */
const MAN_HINH = [
  { ten: "bat-dau", duong: "/bat-dau", uuTien: "cao" },
  { ten: "dashboard", duong: "/dashboard", uuTien: "cao" },
  { ten: "outputs", duong: "/outputs", uuTien: "cao" },
  { ten: "pipelines", duong: "/pipelines", uuTien: "cao" },
  { ten: "projects", duong: "/projects", uuTien: "cao" },
  { ten: "automations", duong: "/automations", uuTien: "trung" },
  { ten: "settings", duong: "/settings", uuTien: "trung" },
  { ten: "ai-keys", duong: "/ai-keys", uuTien: "trung" },
  { ten: "projects-new", duong: "/projects/new", uuTien: "trung" },
  { ten: "knowledge", duong: "/knowledge", uuTien: "thap" },
  { ten: "analytics", duong: "/analytics", uuTien: "thap" },
  { ten: "wordpress", duong: "/wordpress", uuTien: "thap" },
];

/**
 * Phép đo chạy TRONG trình duyệt.
 *
 * Ba ngoại lệ dưới đây đều từng là lỗi giả trong bộ đo của trang bán hàng, và
 * mỗi lần đều làm cả cột số liệu mất giá trị. Chép sang đây nguyên vẹn:
 *
 *   · Liên kết nằm giữa câu văn KHÔNG cần cao 44px (WCAG 2.5.8 có ngoại lệ) —
 *     bỏ qua sẽ báo hàng chục lỗi giả trên mỗi trang có đoạn văn.
 *   · Phần tử ẩn 1×1px (liên kết "bỏ qua tới nội dung") không phải điểm chạm.
 *   · Hai đích chạm TO nằm sát nhau thì không ai bấm nhầm — chỉ tính khoảng
 *     cách khi ít nhất một đích nhỏ hơn 44px.
 */
function doTrongTrang() {
  const CHAM = "a, button, input, select, textarea, summary, [role=button]";

  const hienRa = (e) => {
    const o = e.getBoundingClientRect();
    if (o.width === 0 || o.height === 0) return false;
    if (o.width <= 2 && o.height <= 2) return false;
    // Nội dung trong <details> ĐANG ĐÓNG vẫn được Chrome dựng bố cục — đo được
    // 214x36 cho một mục điều hướng trong ngăn kéo chưa mở. Người dùng không
    // chạm tới được, nên tính vào là thổi phồng con số: bản đầu báo 53 điểm
    // chạm nhỏ ở một màn hình mà phần lớn nằm sau ngăn kéo đóng.
    //
    // Vẫn phải sửa những mục đó — khi mở ra chúng đúng là 36px — nhưng con số
    // trong báo cáo phải là số người dùng THẬT SỰ gặp.
    const chiTiet = e.closest("details");
    if (chiTiet && !chiTiet.open) return false;
    const k = getComputedStyle(e);
    return k.visibility !== "hidden" && k.display !== "none" && k.opacity !== "0";
  };

  const trongCau = (e) => {
    if (e.tagName !== "A") return false;
    if (getComputedStyle(e).display !== "inline") return false;
    return !!e.closest("p, li, td, th, blockquote, figcaption, dd, dt");
  };

  const rongKhung = document.documentElement.clientWidth;

  // ── Tràn ngang ───────────────────────────────────────────────────────
  const thuPham = [];
  for (const e of Array.from(document.querySelectorAll("body *"))) {
    const o = e.getBoundingClientRect();
    if (o.width === 0) continue;
    let choPhep = false;
    for (let t = e.parentElement; t; t = t.parentElement) {
      if (getComputedStyle(t).overflowX !== "visible") {
        choPhep = true;
        break;
      }
    }
    if (choPhep) continue;
    if (o.right > rongKhung + 1 || o.left < -1) {
      thuPham.push({
        the: e.tagName.toLowerCase(),
        lop: (e.className || "").toString().slice(0, 70),
        rong: Math.round(o.width),
        phai: Math.round(o.right),
        chu: (e.textContent || "").trim().slice(0, 35),
      });
    }
  }

  // ── Điểm chạm ────────────────────────────────────────────────────────
  // Hộp đánh dấu và nút chọn thì vùng bấm thật là CẢ CÁI NHÃN, không phải
  // riêng ô vuông 13x13. Bấm chỗ nào trong nhãn cũng trúng — trình duyệt xử lý
  // việc đó, và người dùng cũng làm vậy theo bản năng.
  //
  // ⚠️ CHỈ áp cho checkbox/radio. Bản trước áp cho MỌI ô nhập và làm con số
  // xấu đi: ô nhập chữ thường có nhãn rời kiểu <label for> chỉ là một dòng chữ
  // cao 16px, nên đo nhãn thay vì đo ô là đo nhầm sang phía nhỏ hơn — bộ đo
  // báo thêm hàng chục lỗi giả ở đúng những màn vừa sửa xong.
  const vungBamThat = (e) => {
    const kieu = (e.getAttribute("type") || "").toLowerCase();
    if (kieu !== "checkbox" && kieu !== "radio") return e.getBoundingClientRect();
    const nhan =
      e.closest("label") ||
      (e.id ? document.querySelector("label[for=" + JSON.stringify(e.id) + "]") : null);
    return nhan ? nhan.getBoundingClientRect() : e.getBoundingClientRect();
  };

  const diem = [];
  for (const e of Array.from(document.querySelectorAll(CHAM))) {
    if (!hienRa(e) || trongCau(e)) continue;
    const o = vungBamThat(e);
    diem.push({
      chu: (e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 34),
      rong: Math.round(o.width),
      cao: Math.round(o.height),
      x: o.left,
      y: o.top + window.scrollY,
      x2: o.right,
      y2: o.bottom + window.scrollY,
    });
  }
  const chamNho = diem.filter((d) => d.rong < 44 || d.cao < 44);

  const nho = (d) => d.rong < 44 || d.cao < 44;
  let soSatNhau = 0;
  for (let i = 0; i < diem.length; i++) {
    for (let j = i + 1; j < diem.length; j++) {
      const a = diem[i];
      const b = diem[j];
      if (!nho(a) && !nho(b)) continue;
      const long =
        (a.x <= b.x && a.x2 >= b.x2 && a.y <= b.y && a.y2 >= b.y2) ||
        (b.x <= a.x && b.x2 >= a.x2 && b.y <= a.y && b.y2 >= a.y2);
      if (long) continue;
      const cn = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x2, b.x2));
      const cd = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y2, b.y2));
      if ((cn === 0 && cd === 0) || Math.hypot(cn, cd) < 8) soSatNhau++;
    }
  }

  // ── Cỡ chữ ───────────────────────────────────────────────────────────
  let nhoNhat = 99;
  const chuNho = [];
  for (const e of Array.from(document.querySelectorAll("p, span, li, a, td, th, label, div"))) {
    // Cùng lý do: thanh bên bị ẩn hẳn dưới 768px nhưng chữ trong đó vẫn đọc
    // được cỡ. Bản đầu báo "4 chỗ chữ nhỏ" ở cả 12 màn — con số giống hệt
    // nhau vì phần lớn nằm trong thanh bên KHÔNG hiện trên điện thoại.
    if (!hienRa(e)) continue;
    if (!e.childElementCount && (e.textContent || "").trim().length > 3) {
      const c = parseFloat(getComputedStyle(e).fontSize);
      if (c < nhoNhat) nhoNhat = c;
      if (c < 12) chuNho.push({ co: c, chu: (e.textContent || "").trim().slice(0, 32) });
    }
  }

  // ── Bảng dữ liệu ─────────────────────────────────────────────────────
  //
  // Bảng là thứ vỡ nặng nhất trên màn hẹp. Ghi lại bề rộng thật và có được
  // đặt trong khung cuộn ngang hay không — bảng rộng KHÔNG có khung cuộn là
  // lỗi, bảng rộng CÓ khung cuộn chỉ là bất tiện.
  const bangRong = [];
  for (const t of Array.from(document.querySelectorAll("table"))) {
    const o = t.getBoundingClientRect();
    let cuonDuoc = false;
    for (let n = t.parentElement; n; n = n.parentElement) {
      const k = getComputedStyle(n).overflowX;
      if (k === "auto" || k === "scroll") {
        cuonDuoc = true;
        break;
      }
    }
    bangRong.push({
      cot: t.querySelectorAll("thead th, tr:first-child > *").length,
      rong: Math.round(o.width),
      cuonDuoc,
    });
  }

  return {
    tranNgang: Math.max(0, document.documentElement.scrollWidth - rongKhung),
    thuPham: thuPham.slice(0, 5),
    soChamNho: chamNho.length,
    chamNho: chamNho.slice(0, 5),
    soSatNhau,
    coChuNhoNhat: Math.round(nhoNhat * 10) / 10,
    chuNho: chuNho.slice(0, 4),
    soBang: document.querySelectorAll("table").length,
    bangRong,
    soONhap: document.querySelectorAll("input, select, textarea").length,
    caoTrang: document.documentElement.scrollHeight,
  };
}

/**
 * Chốt cứng "đang chạm bằng ngón tay" ở tầng giao thức.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ PHẢI GỌI LẠI SAU MỖI LẦN ĐIỀU HƯỚNG. Gọi một lần là không đủ.
 *
 * `newContext({ isMobile, hasTouch })` có bật giả lập cảm ứng, nhưng nó TRÔI.
 * Đo được: `matchMedia("(pointer: coarse)")` trả true ở khổ 320 cho cả mười
 * hai màn, rồi sang khổ 360 thì từ màn thứ hai trở đi trả false. Đặt lại
 * một lần qua CDP cũng chỉ giữ được 25 trên 36 phép đo — Playwright tự gọi
 * setEmulatedMedia của nó sau mỗi lần điều hướng và ghi đè.
 *
 * Hậu quả KHÔNG phải sai lệch nhỏ. Mọi quy tắc viết trong
 * `@media (pointer: coarse)` — tức toàn bộ phần nâng điểm chạm lên 44px —
 * bị bỏ qua, nên bộ đo báo 32px cho những ô đã sửa thành 44px. Nó đo một
 * trình duyệt MÁY BÀN rồi gọi kết quả đó là báo cáo điện thoại: sai theo
 * hướng làm người đọc tưởng còn lỗi ở chỗ đã sửa xong, và tệ hơn, sẽ báo
 * "sạch" cho một bản KHÔNG có quy tắc cảm ứng nào cả.
 * ═══════════════════════════════════════════════════════════════════════
 */
async function chotCamUng(cdp) {
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "pointer", value: "coarse" },
      { name: "any-pointer", value: "coarse" },
      { name: "hover", value: "none" },
      { name: "any-hover", value: "none" },
    ],
  });
}

async function dangNhap(page) {
  const tep = JSON.parse(
    await readFile(path.join(process.cwd(), ".data/seed-credentials.json"), "utf8"),
  );
  const chu = tep.accounts.find((a) => a.role === "owner");
  if (!chu) throw new Error("Không tìm thấy tài khoản chủ sở hữu trong .data/seed-credentials.json");

  await page.goto(`${GOC}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.fill('input[type=email], input[name=email]', chu.email);
  await page.fill('input[type=password], input[name=password]', chu.password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
}

async function main() {
  await mkdir(THU_MUC, { recursive: true });
  const trinh = await chromium.launch();
  const bao = [];

  for (const kho of KHO) {
    const ctx = await trinh.newContext({
      viewport: { width: kho.rong, height: kho.cao },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();

    const cdp = await ctx.newCDPSession(page);
    await chotCamUng(cdp);
    await dangNhap(page);

    for (const m of MAN_HINH) {
      try {
        await page.goto(GOC + m.duong, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
        await chotCamUng(cdp);
        const so = await page.evaluate(doTrongTrang);
        bao.push({ man: m.ten, kho: kho.ten, uuTien: m.uuTien, ...so });

        const xau =
          so.tranNgang > 0 ||
          so.soChamNho > 0 ||
          so.soSatNhau > 0 ||
          so.chuNho.length > 0 ||
          so.bangRong.some((b) => !b.cuonDuoc && b.rong > kho.rong);
        process.stdout.write(
          `${xau ? "!" : "✓"} ${m.ten} @${kho.ten}` +
            (xau
              ? `  tràn:${so.tranNgang} chạm nhỏ:${so.soChamNho} sát nhau:${so.soSatNhau} chữ nhỏ:${so.chuNho.length} bảng:${so.soBang}`
              : "") +
            "\n",
        );

        if (kho.ten === "360") {
          await page.screenshot({
            path: path.join(THU_MUC, `${m.ten}--360.png`),
            fullPage: true,
          });
        }
      } catch (e) {
        bao.push({
          man: m.ten,
          kho: kho.ten,
          uuTien: m.uuTien,
          loi: String(e).slice(0, 140),
        });
        process.stdout.write(`✗ ${m.ten} @${kho.ten} — ${String(e).slice(0, 70)}\n`);
      }
    }
    await ctx.close();
  }

  await trinh.close();
  await writeFile(path.join(THU_MUC, "bao-cao.json"), JSON.stringify(bao, null, 1), "utf8");
  process.stdout.write(`\nBáo cáo: ${path.join(THU_MUC, "bao-cao.json")}\n`);
}

void main();

#!/usr/bin/env node
/**
 * SOÁT KHẢ NĂNG TIẾP CẬN của chính Antigravity, trên BẢN DỰNG THẬT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO CÓ (30/09/2026)
 *
 * halongxanh360 — trang cho khách xem — đã được soát tới 100 điểm từ 13/09.
 * Còn Antigravity, màn chủ dự án ngồi làm việc MỖI NGÀY, thì chưa bao giờ đo.
 * Lỗi tiếp cận không báo gì cả: nút vẫn bấm được bằng chuột, chữ vẫn đọc được
 * nếu mắt tốt, nên nó tích lại cho tới khi ai đó dùng bàn phím hoặc màn hình
 * nhỏ.
 *
 * Dùng axe-core — cùng bộ luật Lighthouse dùng — nhưng chạy SAU KHI ĐĂNG
 * NHẬP, thứ Lighthouse không tự làm được. Mật khẩu đọc từ
 * `.data/seed-credentials.json`, KHÔNG in ra.
 *
 * ⚠️ Chạy trên `next start` (bản dựng thật), không phải `next dev`: bản dev
 * chèn thêm thanh công cụ của Next và chính sách CSP khác.
 *
 * Chạy:  npx next build && npx next start -p 3243
 *        node scripts/soat-tiep-can.mjs
 *        GOC=http://localhost:3243 node scripts/soat-tiep-can.mjs
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

const GOC = process.env.GOC ?? "http://localhost:3243";
const TRANG = [
  "/bat-dau",
  "/dashboard",
  "/tro-chuyen",
  "/projects",
  "/pipelines",
  "/automations",
  "/ai-keys",
  "/outputs",
  "/analytics",
  "/settings",
  "/knowledge",
];

const creds = JSON.parse(await readFile(".data/seed-credentials.json", "utf8"));
const owner = creds.accounts.find((a) => a.role === "owner");
if (!owner) {
  console.error("Thiếu tài khoản chủ sở hữu trong .data/seed-credentials.json");
  process.exit(1);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addCookies([{ name: "antigravity-che-do", value: "nang-cao", url: GOC }]);
const page = await ctx.newPage();

await page.goto(`${GOC}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
// Soát cả trang đăng nhập — nó là trang duy nhất người chưa đăng nhập thấy.
const soat = async (duong) => {
  const kq = await new AxeBuilder({ page })
    // Chỉ luật WCAG 2.1 A/AA: mức mọi trang nên đạt, bỏ "best-practice" gây ồn.
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return kq.violations.map((v) => ({
    duong,
    luat: v.id,
    muc: v.impact,
    mo: v.help,
    so: v.nodes.length,
    viDu: (v.nodes[0]?.html ?? "").slice(0, 120),
  }));
};

const loi = [...(await soat("/login"))];

await page.getByLabel("Email").fill(owner.email);
await page.getByLabel("Mật khẩu").fill(owner.password);
await page.getByRole("button", { name: "Đăng nhập" }).click();
await page.waitForURL(/\/(bat-dau|dashboard)/, { timeout: 120_000 });

for (const duong of TRANG) {
  try {
    await page.goto(GOC + duong, { waitUntil: "networkidle", timeout: 90_000 });
    loi.push(...(await soat(duong)));
  } catch (e) {
    loi.push({ duong, luat: "KHONG-MO-DUOC", muc: "serious", mo: String(e).slice(0, 120), so: 1, viDu: "" });
  }
}
await browser.close();

const theoLuat = new Map();
for (const l of loi) {
  const k = `${l.luat}|${l.muc}|${l.mo}`;
  if (!theoLuat.has(k)) theoLuat.set(k, { ...l, trang: [], tong: 0 });
  const g = theoLuat.get(k);
  g.trang.push(l.duong);
  g.tong += l.so;
}

console.log(`Soát ${TRANG.length + 1} trang trên ${GOC}`);
console.log(`Vi phạm WCAG 2.1 A/AA: ${theoLuat.size} loại · ${loi.reduce((a, b) => a + b.so, 0)} chỗ\n`);
const thuTu = { critical: 0, serious: 1, moderate: 2, minor: 3 };
for (const g of [...theoLuat.values()].sort((a, b) => (thuTu[a.muc] ?? 9) - (thuTu[b.muc] ?? 9))) {
  console.log(`[${g.muc}] ${g.luat} — ${g.mo}`);
  console.log(`   ${g.tong} chỗ, ${g.trang.length} trang: ${[...new Set(g.trang)].join(", ")}`);
  if (g.viDu) console.log(`   ví dụ: ${g.viDu}`);
  console.log("");
}
process.exit(theoLuat.size > 0 ? 1 : 0);

import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { batNangCao } from "./che-do";

/**
 * MỌI TRANG TRONG ỨNG DỤNG ĐỀU MỞ ĐƯỢC — lưới bắt trang vỡ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO CẦN
 *
 * Bộ kiểm thường ngày (`npm test`) chạy hàm, không chạy trang. Một trang vỡ vì
 * lỗi lúc dựng phía máy chủ — thiếu `await searchParams`, một thành phần
 * client nhập nhầm mô-đun `server-only`, một truy vấn ném khi bảng rỗng — thì
 * test vẫn xanh, `tsc` vẫn xanh, và chỉ người mở trang mới thấy.
 *
 * Đã có tiền lệ thật: bộ e2e cũ khẳng định sai về màn hình sau đăng nhập suốt
 * nhiều vòng mà không ai biết, vì không ai chạy nó.
 *
 * Phép thử này cố tình NÔNG: mở trang, đòi HTTP 2xx, đòi có tiêu đề, và đòi
 * không có dấu vết của màn hình lỗi Next. Nông nhưng phủ rộng — nó bắt đúng
 * loại lỗi mà test sâu bỏ sót.
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface SeedAccount {
  email: string;
  password: string;
  role: "owner" | "editor" | "viewer";
}

async function getSeedAccount(role: SeedAccount["role"]): Promise<SeedAccount> {
  const source = await readFile(path.resolve(".data", "e2e-credentials.json"), "utf8");
  const credentials = JSON.parse(source) as { accounts: SeedAccount[] };
  const account = credentials.accounts.find((c) => c.role === role);
  if (!account) throw new Error(`Missing ${role} seed account.`);
  return account;
}

async function dangNhap(page: Page): Promise<void> {
  const owner = await getSeedAccount("owner");
  await page.goto("/login");
  await page.getByLabel("Email").fill(owner.email);
  await page.getByLabel("Mật khẩu").fill(owner.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/(bat-dau|dashboard)$/);
}

/** Mở một địa chỉ và đòi nó ra một trang tử tế. */
async function trangMoDuoc(page: Page, duong: string): Promise<void> {
  const dap = await page.goto(duong);
  expect(dap?.status(), `${duong} trả HTTP ${dap?.status()}`).toBeLessThan(400);
  // Màn hình lỗi của Next (server component ném) in đúng những chữ này.
  const than = (await page.locator("body").innerText()).slice(0, 4000);
  for (const xau of ["Application error", "Unhandled Runtime Error", "Internal Server Error", "This page could not be found"]) {
    expect(than, `${duong} hiện màn lỗi: ${xau}`).not.toContain(xau);
  }
  // Mọi trang phải có ít nhất một tiêu đề — trang trắng thì không.
  await expect(page.locator("h1, h2").first(), `${duong} không có tiêu đề nào`).toBeVisible();
}

const TRANG_NANG_CAO = [
  "/dashboard",
  "/projects",
  "/projects/new",
  "/ai-keys",
  "/pipelines",
  "/pipelines?luong=website_draft",
  "/automations",
  "/automations/run/RIS_WEB_Y_DINH",
  "/automations/run/RIS_WEB_KIEN_TRUC",
  "/automations/run/RIS_CONTENT_HEADLINE",
  "/wordpress",
  "/outputs",
  "/analytics",
  "/knowledge",
  "/settings",
  "/bat-dau",
];

const TRANG_DON_GIAN = ["/bat-dau", "/outputs", "/projects", "/settings"];

test("bản Nâng cao: mọi trang trong thanh bên đều mở được", async ({ page }) => {
  await batNangCao(page);
  await dangNhap(page);
  for (const duong of TRANG_NANG_CAO) await trangMoDuoc(page, duong);
});

test("bản Đơn giản: bốn mục thanh bên và trang dự án đều mở được", async ({ page }) => {
  await dangNhap(page);
  for (const duong of TRANG_DON_GIAN) await trangMoDuoc(page, duong);

  // Trang chi tiết của dự án đầu tiên — nơi ba thẻ tự động hoá nằm.
  await page.goto("/projects");
  const xem = page.getByRole("link", { name: "Xem chi tiết" }).first();
  if (await xem.count()) {
    await xem.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "Lịch đăng bài tự động" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Website dựng sẵn" })).toBeVisible();
  }
});

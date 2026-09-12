import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { batNangCao } from "./che-do";

interface SeedAccount {
  email: string;
  password: string;
  role: "owner" | "editor" | "viewer";
}

async function signIn(page: Page, role: SeedAccount["role"]): Promise<void> {
  const source = await readFile(
    path.resolve(".data", "e2e-credentials.json"),
    "utf8",
  );
  const accounts = (JSON.parse(source) as { accounts: SeedAccount[] }).accounts;
  const account = accounts.find((candidate) => candidate.role === role);
  if (!account) throw new Error(`Missing ${role} seed account.`);
  // Bản đầy đủ: phép thử này đo những màn chỉ có ở chế độ Nâng cao.
  await batNangCao(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Mật khẩu").fill(account.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("catalog liệt kê module app-native và trỏ Module 1 tới trang riêng", async ({
  page,
}) => {
  await signIn(page, "editor");
  await page.goto("/automations");
  await expect(page.getByTestId("automation-card").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Mở Module 1" }).first(),
  ).toHaveAttribute("href", "/automations/sitemap");
  // Không còn panel "schema mô phỏng" nào.
  await expect(
    page.getByRole("button", { name: "Kiểm tra schema (mock)" }),
  ).toHaveCount(0);
});

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
  const source = await readFile(path.resolve(".data", "e2e-credentials.json"), "utf8");
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

test("owner updates workspace settings and restores the seeded values", async ({
  page,
}) => {
  await signIn(page, "owner");
  await page.goto("/settings");
  await expect(page.getByText("Thành viên (3)")).toBeVisible();
  await page.getByLabel("Tên workspace").fill("Antigravity Local QA");
  await page.getByLabel("Slug workspace").fill("antigravity-local-qa");
  await page.getByRole("button", { name: "Lưu workspace" }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  await page.reload();
  await expect(page.getByLabel("Tên workspace")).toHaveValue("Antigravity Local QA");

  await page.getByLabel("Tên workspace").fill("Antigravity Local");
  await page.getByLabel("Slug workspace").fill("antigravity-local");
  await page.getByRole("button", { name: "Lưu workspace" }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
});

test("viewer sees persisted placeholders and cannot mutate the workspace", async ({
  page,
}) => {
  await signIn(page, "viewer");
  await page.goto("/pipelines");
  // Trang Quy trình giờ là runner chạy cả luồng với sơ đồ live; viewer thấy sơ đồ
  // nhưng không có quyền chạy (nút bị vô hiệu).
  await expect(
    page.getByRole("heading", { name: /Quy trình · Chạy cả luồng/ }),
  ).toBeVisible();
  await expect(page.getByTestId("pipeline-graph")).toContainText("Module 2");
  await expect(page.getByTestId("pipeline-graph")).toContainText("Module 11");
  await expect(
    page.getByRole("button", { name: /Chạy cả luồng/ }),
  ).toBeDisabled();

  await page.goto("/knowledge");
  await expect(page.getByText("Mẫu giọng thương hiệu")).toBeVisible();
  await expect(page.getByText("Mẫu dàn ý nội dung")).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByLabel("Tên workspace")).toBeDisabled();
  const response = await page.request.patch("/api/v1/workspace", {
    data: { name: "Denied", slug: "denied-workspace" },
  });
  expect(response.status()).toBe(403);
});

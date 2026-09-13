import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { batNangCao } from "./che-do";

interface SeedAccount {
  email: string;
  password: string;
  role: "owner" | "editor" | "viewer";
}

interface SeedCredentials {
  accounts: SeedAccount[];
}

async function getSeedAccount(role: SeedAccount["role"]): Promise<SeedAccount> {
  const source = await readFile(
    path.resolve(".data", "e2e-credentials.json"),
    "utf8",
  );
  const credentials = JSON.parse(source) as SeedCredentials;
  const account = credentials.accounts.find((candidate) => candidate.role === role);
  if (!account) {
    throw new Error(`Missing ${role} seed account.`);
  }
  return account;
}

test("health and readiness are public and operational", async ({ request }) => {
  const health = await request.get("/api/v1/health");
  expect(health.status()).toBe(200);
  await expect(health.json()).resolves.toMatchObject({ status: "ok" });

  const readiness = await request.get("/api/v1/ready");
  expect(readiness.status()).toBe(200);
  await expect(readiness.json()).resolves.toMatchObject({
    status: "ready",
    checks: {
      database: true,
      vault: true,
      auth: true,
      automationProvider: "app-native",
      storageProvider: "local",
    },
  });
});

test("protected workspace redirects to login and authenticates an owner", async ({
  page,
}) => {
  const owner = await getSeedAccount("owner");
  // Chế độ MẶC ĐỊNH là Đơn giản: /dashboard vẫn là trang cần đăng nhập, nhưng
  // sau khi đăng nhập thì đích là /bat-dau (xem `lib/che-do-don-gian.ts`).
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(owner.email);
  await page.getByLabel("Mật khẩu").fill(owner.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page).toHaveURL(/\/bat-dau$/);
  await expect(
    page.getByRole("heading", { name: "Hôm nay bạn muốn làm gì?" }),
  ).toBeVisible();

  const session = await page.request.get("/api/v1/auth/session");
  expect(session.status()).toBe(200);
  await expect(session.json()).resolves.toMatchObject({
    identity: { role: "owner", workspaceSlug: "antigravity-local" },
  });

  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("bản Nâng cao vẫn vào Tổng quan sau khi đăng nhập", async ({ page }) => {
  const owner = await getSeedAccount("owner");
  await batNangCao(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(owner.email);
  await page.getByLabel("Mật khẩu").fill(owner.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  // ⚠️ KHÔNG đọc chữ "Tổng quan" ở đây. Phép thử cũ khẳng định có tiêu đề
  // "Tổng quan" trên trang này; chữ đó chỉ tồn tại ở thanh bên và đường dẫn
  // điều hướng, KHÔNG phải tiêu đề — nên phép thử đó hỏng từ lúc tiêu đề
  // trang đổi thành "Đưa nội dung bay lên top", và không ai biết vì bộ e2e
  // không nằm trong cổng kiểm thường ngày (chỉ `npm run test:e2e` mới chạy).
  await expect(
    page.getByRole("heading", { name: /bay lên top/ }),
  ).toBeVisible();
  // Thanh bên bản đầy đủ có mục mà bản Đơn giản không có.
  await expect(page.getByRole("link", { name: "Quy trình" })).toBeVisible();
});

test("viewer identity is preserved as read-only role", async ({ page }) => {
  const viewer = await getSeedAccount("viewer");
  await page.goto("/login");
  await page.getByLabel("Email").fill(viewer.email);
  await page.getByLabel("Mật khẩu").fill(viewer.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/bat-dau$/);

  const session = await page.request.get("/api/v1/auth/session");
  expect(session.status()).toBe(200);
  await expect(session.json()).resolves.toMatchObject({
    identity: { role: "viewer" },
  });
});

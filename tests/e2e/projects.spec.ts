import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

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

async function signIn(page: Page, role: SeedAccount["role"]): Promise<void> {
  const account = await getSeedAccount(role);
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Mật khẩu").fill(account.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("editor creates a persisted project with competitors and an encrypted WordPress placeholder", async ({
  page,
}) => {
  await signIn(page, "editor");
  const projectName = `E2E Project ${Date.now()}`;

  await page.goto("/projects/new");
  await page.getByLabel("Tên dự án").fill(projectName);
  await page.getByLabel("URL website").fill("https://e2e.example.com");
  await page.getByLabel("Địa điểm / thị trường").fill("TP. Hồ Chí Minh");
  await page.getByLabel("Ngành nghề").fill("Công nghệ");
  await page.getByLabel("Tên miền đối thủ").fill("competitor.example.com");
  await page.getByRole("button", { name: "Thêm", exact: true }).click();
  await page.getByLabel("WordPress URL").fill("https://blog.e2e.example.com");
  await page.getByLabel("Tên đăng nhập").fill("publisher");
  await page.getByLabel("Mật khẩu ứng dụng").fill("local-placeholder-only");
  await page.getByRole("button", { name: "Tạo dự án" }).click();

  await expect(page).toHaveURL(/\/projects$/);
  const projectCard = page
    .getByTestId("project-card")
    .filter({ hasText: projectName });
  await expect(projectCard).toBeVisible();
  await expect(projectCard.getByText("competitor.example.com")).toBeVisible();
  await expect(
    projectCard.getByText("WordPress", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByTestId("project-card").filter({ hasText: projectName }),
  ).toBeVisible();

  await projectCard.getByRole("link", { name: "Xem chi tiết" }).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/);
  const updatedName = `${projectName} Updated`;
  await page.getByLabel("Tên dự án").fill(updatedName);
  await page.getByLabel("Thêm đối thủ").fill("second.example.com");
  await page.getByRole("button", { name: "Thêm", exact: true }).click();
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  await page.reload();
  await expect(page.getByLabel("Tên dự án")).toHaveValue(updatedName);
  await expect(page.getByText("second.example.com")).toBeVisible();

  const response = await page.request.get("/api/v1/projects");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain(updatedName);
  expect(body).not.toContain("local-placeholder-only");
  expect(body).not.toContain("encryptedCredentials");
});

test("viewer cannot create projects through either UI or API", async ({ page }) => {
  await signIn(page, "viewer");
  const response = await page.request.post("/api/v1/projects", {
    data: {
      name: "Forbidden Project",
      website: "https://forbidden.example.com",
      language: "English",
      tone: "Professional",
    },
  });
  expect(response.status()).toBe(403);
  const updateResponse = await page.request.patch(
    "/api/v1/projects/00000000-0000-0000-0000-000000000000",
    { data: {} },
  );
  expect(updateResponse.status()).toBe(403);

  await page.goto("/projects/new");
  await expect(
    page.getByRole("heading", { name: "Workspace chỉ đọc" }),
  ).toBeVisible();
});

test("owner can archive a project without deleting its persisted record", async ({
  page,
}) => {
  await signIn(page, "owner");
  const createdResponse = await page.request.post("/api/v1/projects", {
    data: {
      name: `Archive E2E ${Date.now()}`,
      website: "https://archive.example.com",
      language: "English",
      tone: "Professional",
      competitors: [],
    },
  });
  expect(createdResponse.status()).toBe(201);
  const created = (await createdResponse.json()) as {
    project: { id: string };
  };

  const archiveResponse = await page.request.delete(
    `/api/v1/projects/${created.project.id}`,
  );
  expect(archiveResponse.status()).toBe(200);
  await expect(archiveResponse.json()).resolves.toMatchObject({
    project: { id: created.project.id, status: "archived" },
  });

  const readResponse = await page.request.get(
    `/api/v1/projects/${created.project.id}`,
  );
  expect(readResponse.status()).toBe(200);
  await expect(readResponse.json()).resolves.toMatchObject({
    project: { status: "archived" },
  });
});

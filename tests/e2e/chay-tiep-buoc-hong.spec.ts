import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { batNangCao } from "./che-do";

/**
 * "Chạy tiếp từ bước hỏng" — không tốn một lượt gọi model nào.
 *
 * Tuyến tạo job bị chặn ngay trong trình duyệt và trả lời giả: bước 1 xong,
 * bước 2 hỏng lần đầu (model trả JSON không hợp lệ — lỗi thoáng qua có thật),
 * rồi mọi bước xong. Phép thử đo đúng thứ người dùng cần: sau khi hỏng có nút
 * chạy tiếp, bấm vào thì bước 1 KHÔNG chạy lại, và bước 2 nối vào job bước 1.
 */

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
  await batNangCao(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Mật khẩu").fill(account.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("bước 2 hỏng → nút chạy tiếp; bấm thì bước 1 không chạy lại, bước 2 nối vào job bước 1", async ({ page }) => {
  await signIn(page, "owner");
  // Nút Chạy chỉ bật khi người dùng có khoá AI. Lưu một khoá GIẢ (không bao
  // giờ được gọi: tuyến tạo job bị chặn ở trình duyệt) rồi xoá khi xong — kể
  // cả khi phép thử hỏng giữa chừng.
  const luuKhoa = await page.request.post("/api/v1/ai/keys", {
    data: { provider: "deepseek", apiKey: "sk-e2e-gia-lap-khong-that-0000" },
  });
  expect(luuKhoa.status()).toBe(201);
  try {
    await chayThu(page);
  } finally {
    await page.request.delete("/api/v1/ai/keys", { data: { provider: "deepseek" } });
  }
});

async function chayThu(page: Page): Promise<void> {
  await page.goto("/pipelines?luong=website_draft");
  await expect(page.getByRole("heading", { name: /Quy trình · Chạy cả luồng/ })).toBeVisible();

  const oMoTa = page.getByLabel("Website này để làm gì, cho ai?");
  await oMoTa.fill("Sàn môi giới ở Hạ Long, chuyên căn hộ và đất nền. Khách xem bảng giá, quỹ căn rồi để lại số.");
  // Bộ khối suy từ câu mô tả (dự án e2e không khai ngành): có "căn hộ", "đất nền" → bất động sản.
  await expect(page.getByTestId("bo-khoi")).toContainText("Bất động sản");
  const oTen = page.getByLabel("Tên doanh nghiệp / thương hiệu");
  if (!(await oTen.inputValue()).trim()) await oTen.fill("Nha khoa Bình Minh");

  const nutChay = page.getByRole("button", { name: /Chạy cả luồng/ });
  await expect(nutChay).toBeEnabled();

  const daGoi: Array<{ key: string; upstream: string[]; nganh?: string }> = [];
  let lanKienTruc = 0;
  await page.route("**/api/v1/modules/*/jobs", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const key = new URL(route.request().url()).pathname.split("/")[4]!;
    const body = route.request().postDataJSON() as { input: { upstreamJobIds?: string[]; nganh?: string } };
    daGoi.push({ key, upstream: body.input.upstreamJobIds ?? [], nganh: body.input.nganh });
    const hong = key === "RIS_WEB_KIEN_TRUC" && ++lanKienTruc === 1;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        job: {
          id: `job-${daGoi.length}`,
          status: hong ? "failed" : "succeeded",
          output: hong ? null : { ok: true },
          errorMessage: hong ? "Model trả JSON không hợp lệ (giả lập)" : null,
        },
      }),
    });
  });

  await nutChay.click();
  await expect(page.getByRole("alert").filter({ hasText: "Dừng ở Module 25" })).toBeVisible();
  const nutTiep = page.getByRole("button", { name: /Chạy tiếp từ bước 25/ });
  await expect(nutTiep).toBeVisible();
  await expect(nutTiep).toContainText("tiết kiệm 1 lượt gọi");
  expect(daGoi.map((g) => g.key)).toEqual(["RIS_WEB_Y_DINH", "RIS_WEB_KIEN_TRUC"]);

  // Tải lại trang giữa chừng (rời tab trên điện thoại): lượt chạy phải còn —
  // bước 1 xong, bước 2 hỏng, nút chạy tiếp vẫn đó. Không có gì gọi lại máy chủ.
  await page.reload();
  await expect(page.getByRole("button", { name: /Chạy tiếp từ bước 25/ })).toBeVisible();
  expect(daGoi.map((g) => g.key)).toEqual(["RIS_WEB_Y_DINH", "RIS_WEB_KIEN_TRUC"]);
  // Ô mô tả tải lại từ preset đã lưu hoặc trống — điền lại cho chắc.
  const oMoTa2 = page.getByLabel("Website này để làm gì, cho ai?");
  if (!(await oMoTa2.inputValue()).trim()) await oMoTa2.fill("Sàn môi giới ở Hạ Long, chuyên căn hộ và đất nền.");

  await nutTiep.click();
  await expect(page.getByTestId("dung-web-xong")).toBeVisible();
  expect(daGoi.map((g) => g.key)).toEqual([
    "RIS_WEB_Y_DINH",
    "RIS_WEB_KIEN_TRUC",
    "RIS_WEB_KIEN_TRUC",
    "RIS_WEB_THIET_KE",
    "RIS_WEB_VIET_CHU",
  ]);
  // Bước 2 chạy lại nối vào job bước 1 của lượt trước — không phải một bản cũ.
  expect(daGoi[2]!.upstream).toEqual(["job-1"]);
  // Bước Kiến trúc nhận đúng bộ khối đã suy — không rơi về "chung" như trước.
  expect(daGoi[1]!.nganh).toBe("bat-dong-san");
  expect(daGoi[2]!.nganh).toBe("bat-dong-san");
  expect(daGoi[4]!.upstream).toEqual(["job-1", "job-3", "job-4"]);
  // Không còn nút chạy tiếp khi mọi bước đã xong.
  await expect(nutTiep).toBeHidden();
}

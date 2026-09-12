import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { batNangCao } from "./che-do";

/**
 * Thẻ "Website dựng sẵn" → khung "GitHub → Cloudflare tự dựng".
 *
 * Không có bản dựng thật trong CSDL e2e và không có token GitHub thật, nên
 * ba tuyến bị chặn ở trình duyệt và trả lời giả. Phép thử đo phần người dùng
 * thấy: dán token → tên tài khoản hiện; bấm đẩy → link kho + ba bước nối
 * Cloudflare lần đầu. Phần máy chủ (kiểm token với GitHub, Git Data API) có
 * phép thử đơn vị với GitHub giả ở `tests/unit/github-day.test.ts`.
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

test("dán token → đẩy lên GitHub → hướng dẫn nối Cloudflare lần đầu", async ({ page }) => {
  await signIn(page, "owner");

  // Tuyến máy chủ thật, không cần GitHub: token quá ngắn bị từ chối ngay;
  // trạng thái ban đầu là chưa nối; đẩy khi chưa có số điện thoại bị chặn.
  const ngan = await page.request.post("/api/v1/github/token", { data: { token: "abc" } });
  expect(ngan.status()).toBe(400);
  const tt = await page.request.get("/api/v1/github/token");
  expect(await tt.json()).toEqual({ ketNoi: null });

  await page.goto("/projects");
  const linkDuAn = page.locator('a[href^="/projects/"]').filter({ hasNotText: /Tạo dự án/ }).first();
  const href = await linkDuAn.getAttribute("href");
  expect(href).toBeTruthy();
  const projectId = href!.split("/")[2]!;
  const khongSo = await page.request.post(`/api/v1/projects/${projectId}/dung-web/github`, { data: { dienThoai: "" } });
  expect(khongSo.status()).toBe(400);
  expect(((await khongSo.json()) as { lyDo: string }).lyDo).toContain("số điện thoại");

  // Từ đây trả lời giả để đo giao diện.
  await page.route(`**/api/v1/projects/${projectId}/dung-web`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        coBanDung: true,
        tenWebsite: "Nha khoa Bình Minh",
        soTrang: 1,
        trang: [{ duong: "/", tieuDe: "Trang chủ", soKhoi: 3 }],
        soTep: 30,
        soAnhDrive: null,
        soat: [],
        danhSachTep: [],
        boQua: [],
        thieu: [],
        duLieuCan: [],
        canVietMoi: [],
      }),
    }),
  );
  await page.route(`**/api/v1/projects/${projectId}/dung-web/github`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ketNoi: null, kho: null }) });
    }
    const than = route.request().postDataJSON() as { dienThoai: string };
    expect(than.dienThoai).toBe("0912 345 678");
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        trangThai: "ok",
        lanDau: true,
        soLoiNang: 0,
        kho: { owner: "cogiang", repo: "web-nha-khoa-binh-minh", url: "https://github.com/cogiang/web-nha-khoa-binh-minh", nhanh: "main", dayLuc: new Date().toISOString(), sha: "abc", soTep: 33 },
      }),
    });
  });
  await page.route("**/api/v1/github/token", (route) => {
    const than = route.request().postDataJSON() as { token: string };
    expect(than.token).toBe("github_pat_gia_lap_khong_that_1234567890");
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ketNoi: { login: "cogiang", luuLuc: new Date().toISOString() } }) });
  });

  await page.goto(`/projects/${projectId}`);
  const the = page.locator("#dung-web");
  await expect(the.getByText("GitHub → Cloudflare tự dựng")).toBeVisible();

  await the.getByLabel("Token GitHub").fill("github_pat_gia_lap_khong_that_1234567890");
  await the.getByRole("button", { name: "Lưu token" }).click();
  await expect(the.getByText("GitHub:")).toContainText("cogiang");

  // Chưa có số điện thoại thì nút đẩy chưa bật.
  const nutDay = the.getByRole("button", { name: "Đẩy lên GitHub" });
  await expect(nutDay).toBeDisabled();
  await the.getByLabel("Số điện thoại hiện trên website").fill("0912 345 678");
  await expect(nutDay).toBeEnabled();
  await nutDay.click();

  const ketQua = the.getByRole("status").filter({ hasText: "Đã đẩy lên" });
  await expect(ketQua).toBeVisible();
  await expect(ketQua.getByRole("link", { name: "cogiang/web-nha-khoa-binh-minh" })).toHaveAttribute("href", "https://github.com/cogiang/web-nha-khoa-binh-minh");
  await expect(ketQua).toContainText("Import a repository");
  await expect(ketQua).toContainText("npm run dung-cloudflare");
  // Đẩy xong thì nút đổi thành "bản mới".
  await expect(the.getByRole("button", { name: "Đẩy bản mới lên GitHub" })).toBeVisible();
});

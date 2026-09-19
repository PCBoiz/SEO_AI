import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Màn Trò chuyện — đường ĐAU NHẤT: lượt gọi AI hỏng.
 *
 * Tài khoản thử được gắn một khoá DeepSeek **GIẢ**, nên lượt đầu là một lỗi
 * THẬT từ nhà cung cấp (401). Đó chính là điều cần đo: tin người dùng phải đã
 * nằm trong cơ sở dữ liệu trước khi gọi model, màn phải mời "Gửi lại", và câu
 * lỗi không được lộ khoá. Không bao giờ dùng khoá thật ở đây — mỗi lượt gọi là
 * tiền của chủ dự án.
 *
 * Lượt thứ hai được trả lời GIẢ ngay ở trình duyệt (`page.route`) để có một
 * lượt THÀNH CÔNG mà không tốn tiền. Nó bắt đúng lỗi đã sửa ngày 15/09/2026:
 * sau một lượt hỏng, tin người dùng chỉ tồn tại trên màn dưới dạng tin tạm, nên
 * lượt thành công kế tiếp lọc bỏ tin tạm là tin cũ biến mất khỏi màn tuy vẫn
 * còn trong cơ sở dữ liệu.
 */

/** Không bắt đầu bằng `sk-` để máy quét bí mật khỏi báo động giả. */
const KHOA_GIA = "khoa-gia-e2e-khong-phai-khoa-that-0000";
const TIN_A = "Website sàn môi giới nên có những trang nào?";
const TIN_B = "Viết giúp tôi đoạn giới thiệu 3 câu.";
const TRA_LOI_GIA = "Trang chủ, Danh sách bất động sản, Chi tiết, Liên hệ. (trả lời GIẢ để đo giao diện)";

interface SeedAccount {
  email: string;
  password: string;
  role: "owner" | "editor" | "viewer";
}

async function dangNhapChuSoHuu(page: Page): Promise<void> {
  const source = await readFile(path.resolve(".data", "e2e-credentials.json"), "utf8");
  const account = (JSON.parse(source) as { accounts: SeedAccount[] }).accounts.find((a) => a.role === "owner");
  if (!account) throw new Error("Thiếu tài khoản chủ sở hữu trong dữ liệu gieo.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Mật khẩu").fill(account.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/bat-dau$/);
}

/** Bong bóng tin trong khung trò chuyện — KHÔNG phải tiêu đề cuộc ở danh sách bên. */
const bongBong = (page: Page, chu: string) => page.locator("ol li").filter({ hasText: chu });

test("AI hỏng: tin vẫn được lưu, mời Gửi lại, và lượt sau không nuốt mất tin cũ", async ({ page }) => {
  // Lượt đầu gọi thật ra nhà cung cấp (401 ngay), nhưng máy chủ chừa tới 90 giây
  // cho một lượt gọi — nới trần của phép thử để mạng chậm không thành hỏng giả.
  test.setTimeout(180_000);
  await dangNhapChuSoHuu(page);

  const luuKhoa = await page.request.post("/api/v1/ai/keys", {
    data: { provider: "deepseek", apiKey: KHOA_GIA, model: "deepseek-chat" },
  });
  expect(luuKhoa.status()).toBe(201);

  try {
    await page.getByRole("link", { name: "Trò chuyện" }).first().click();
    await expect(page).toHaveURL(/\/tro-chuyen$/);
    await expect(page.getByRole("heading", { name: "Trò chuyện", level: 1 })).toBeVisible();
    await expect(page.locator("#tro-chuyen-o-nhap")).toBeEnabled();

    // ── Lượt 1: lỗi thật ──
    await page.fill("#tro-chuyen-o-nhap", TIN_A);
    await page.getByRole("button", { name: "Gửi", exact: true }).click();

    const nutGuiLai = page.getByRole("button", { name: "Gửi lại" });
    await expect(nutGuiLai).toBeVisible({ timeout: 120_000 });
    const chuLoi = await page.locator("[role=alert]").first().innerText();
    expect(chuLoi).not.toContain(KHOA_GIA);
    expect(chuLoi).not.toMatch(/Bearer/i);
    await expect(bongBong(page, TIN_A)).toHaveCount(1);

    // ── Lượt 2: trả lời giả, thành công ──
    await page.route("**/api/v1/tro-chuyen/*/tin-nhan", async (route) => {
      const luc = new Date().toISOString();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          troChuyen: { id: "gia", projectId: null, tieuDe: TIN_A, updatedAt: luc },
          tinNguoiDung: { id: "gia-hoi", vai: "nguoi-dung", noiDung: TIN_B, model: null, createdAt: luc },
          tinTroLy: {
            id: "gia-tra",
            vai: "tro-ly",
            noiDung: TRA_LOI_GIA,
            model: "deepseek-chat",
            createdAt: luc,
            // Lượng dùng thật của một lượt — màn phải nói ra vì nó tiêu tiền của người dùng.
            provider: "deepseek",
            inputTokens: 900,
            outputTokens: 350,
            durationMs: 4300,
          },
        }),
      });
    });
    await page.fill("#tro-chuyen-o-nhap", TIN_B);
    await page.getByRole("button", { name: "Gửi", exact: true }).click();
    await expect(bongBong(page, TRA_LOI_GIA)).toHaveCount(1);
    // Cốt lõi của phép thử: tin của lượt HỎNG vẫn phải còn trên màn.
    await expect(bongBong(page, TIN_A)).toHaveCount(1);
    await expect(bongBong(page, TIN_B)).toHaveCount(1);
    // Lượng dùng: dòng phụ dưới câu trả lời + câu tổng ở đầu khung. 900 + 350 =
    // 1.250 token → "1,3k" (làm tròn một chữ số thập phân).
    await expect(page.getByText("DeepSeek · deepseek-chat · 1,3k token (vào 900 · ra 350) · 4,3 giây")).toBeVisible();
    await expect(page.getByText("Cuộc này đã dùng 1,3k token (vào 900 · ra 350) qua 1 lượt hỏi.")).toBeVisible();
    await page.unroute("**/api/v1/tro-chuyen/*/tin-nhan");

    // ── Tải lại: cuộc đã lưu, tiêu đề lấy từ tin đầu ──
    await page.reload();
    const nutCuoc = page.getByRole("button", { name: new RegExp(TIN_A.slice(0, 20)) }).first();
    await expect(nutCuoc).toBeVisible();
    await nutCuoc.click();
    await expect(bongBong(page, TIN_A)).toHaveCount(1);

    // ── Xoá cuộc ──
    page.once("dialog", (d) => void d.accept());
    await page.getByRole("button", { name: /Xoá cuộc trò chuyện/ }).first().click();
    await expect(page.getByRole("button", { name: /Xoá cuộc trò chuyện/ })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("button", { name: /Xoá cuộc trò chuyện/ })).toHaveCount(0);
  } finally {
    await page.request.delete("/api/v1/ai/keys", { data: { provider: "deepseek" } });
  }
});

/**
 * Trợ lý DỰNG WEBSITE trong cuộc trò chuyện (18/09/2026): câu trả lời giả
 * mang khối ```antigravity``` → khối KHÔNG hiện trong bong bóng, thay vào đó
 * là thẻ dựng web. Cuộc chưa gắn dự án → thẻ hỏi chọn/tạo dự án; chọn dự án
 * có sẵn → thẻ tự chạy bước 1. Tuyến tạo job bị chặn ở trình duyệt và trả
 * "hỏng" ngay — không một lượt gọi model nào, và đo được cả đường "chạy tiếp".
 */
const TIN_DUNG = "Dựng giúp tôi website cho sàn Minh Anh Land (tên giả) ở Hạ Long.";
const KHOI_LENH =
  '```antigravity\n{"hanhDong":"dung-website","tenWebsite":"Minh Anh Land (tên giả)","moTa":"Sàn môi giới ở Hạ Long: khách xem quỹ căn, bảng giá rồi để lại số.","nganh":"bất động sản"}\n```';
const TRA_LOI_DUNG = "Mình sẽ dựng website 4 trang cho sàn — đang dựng, xem bên dưới.\n\n" + KHOI_LENH;

test("trợ lý ra khối lệnh → thẻ dựng web hiện, không lộ khối; chọn dự án → tự chạy bước 1", async ({ page }) => {
  test.setTimeout(180_000);
  await dangNhapChuSoHuu(page);
  const luuKhoa = await page.request.post("/api/v1/ai/keys", {
    data: { provider: "deepseek", apiKey: KHOA_GIA, model: "deepseek-chat" },
  });
  expect(luuKhoa.status()).toBe(201);
  let cuocId: string | null = null;
  try {
    await page.route("**/api/v1/tro-chuyen/*/tin-nhan", async (route) => {
      const luc = new Date().toISOString();
      cuocId = route.request().url().split("/tro-chuyen/")[1]!.split("/")[0]!;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          troChuyen: { id: cuocId, projectId: null, tieuDe: TIN_DUNG, updatedAt: luc },
          tinNguoiDung: { id: "gia-hoi-2", vai: "nguoi-dung", noiDung: TIN_DUNG, model: null, createdAt: luc },
          tinTroLy: { id: "gia-tra-2", vai: "tro-ly", noiDung: TRA_LOI_DUNG, model: "deepseek-chat", createdAt: luc, provider: "deepseek", inputTokens: 500, outputTokens: 200, durationMs: 2000 },
        }),
      });
    });
    // Tuyến tạo job: trả job HỎNG ngay — không gọi model, không tốn tiền.
    const jobDaTao: string[] = [];
    await page.route("**/api/v1/modules/*/jobs", async (route) => {
      const key = route.request().url().split("/modules/")[1]!.split("/")[0]!;
      jobDaTao.push(key);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ job: { id: `gia-${jobDaTao.length}`, status: "failed", output: null, errorMessage: "giả lập: không gọi model trong e2e" } }),
      });
    });

    await page.goto("/tro-chuyen");
    await expect(page.locator("#tro-chuyen-o-nhap")).toBeEnabled();
    await page.fill("#tro-chuyen-o-nhap", TIN_DUNG);
    await page.getByRole("button", { name: "Gửi", exact: true }).click();

    const the = page.getByTestId("dung-web-trong-chat");
    await expect(the).toBeVisible();
    await expect(the).toContainText("Dựng website «Minh Anh Land (tên giả)»");
    // Khối lệnh không được lộ ra bong bóng.
    const traLoi = bongBong(page, "đang dựng, xem bên dưới");
    await expect(traLoi).toHaveCount(1);
    await expect(traLoi).not.toContainText("antigravity");
    await expect(traLoi).not.toContainText("hanhDong");
    // Chưa gắn dự án → hỏi chọn/tạo.
    await expect(the.getByRole("button", { name: "Tạo dự án và dựng" })).toBeDisabled();
    await the.getByRole("button", { name: "Dùng dự án này" }).click();

    // Gắn xong → tự chạy bước 1 (job giả trả hỏng) → có nút chạy tiếp.
    await expect(the.getByText("giả lập: không gọi model trong e2e").first()).toBeVisible();
    await expect(the.getByRole("button", { name: "Chạy tiếp từ bước hỏng" })).toBeVisible();
    expect(jobDaTao).toEqual(["RIS_WEB_Y_DINH"]);
    // Dự án đã gắn thật vào cuộc (máy chủ), không chỉ trên màn.
    const cuoc = await page.request.get(`/api/v1/tro-chuyen/${cuocId}`);
    expect(((await cuoc.json()) as { troChuyen: { projectId: string | null } }).troChuyen.projectId).not.toBeNull();
  } finally {
    if (cuocId) await page.request.delete(`/api/v1/tro-chuyen/${cuocId}`);
    await page.request.delete("/api/v1/ai/keys", { data: { provider: "deepseek" } });
  }
});

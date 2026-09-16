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

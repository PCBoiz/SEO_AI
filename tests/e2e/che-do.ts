import type { Page } from "@playwright/test";

/**
 * Đặt chế độ giao diện cho một phép thử e2e.
 *
 * ⚠️ VÌ SAO PHẢI CÓ TỆP NÀY (lỗi thật, 12/09/2026)
 *
 * Chế độ **Đơn giản là mặc định** từ 11/09: thanh bên còn 4 mục, `/dashboard`
 * chuyển về `/bat-dau`, và biểu mẫu sửa dự án gấp vào một khối `<details>`.
 * Các phép thử e2e viết trước đó đều giả định bản Nâng cao — chúng khẳng định
 * địa chỉ sau đăng nhập là `/dashboard`, đọc tiêu đề "Tổng quan", và điền
 * thẳng vào ô "Tên dự án" trên trang dự án (ô đó giờ nằm trong khối gấp, nên
 * `fill()` hỏng vì phần tử không nhìn thấy được).
 *
 * Vitest không chạy thư mục này nên cổng kiểm thường ngày (`npx vitest run`)
 * vẫn xanh — sai lệch chỉ lộ ra khi chạy `npm run test:e2e`. Nên chỗ nào cần
 * bản đầy đủ thì phải NÓI RA, đừng dựa vào mặc định.
 */
export const TEN_COOKIE_CHE_DO = "antigravity-che-do";

/**
 * Bật bản Nâng cao trước khi mở trang đầu tiên.
 *
 * Đặt cookie ở tầng ngữ cảnh (không phải qua giao diện) vì phép thử ở đây đo
 * thứ khác — chuyện đổi chế độ có phép thử riêng.
 */
export async function batNangCao(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: TEN_COOKIE_CHE_DO,
      value: "nang-cao",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
}

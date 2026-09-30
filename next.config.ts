import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // sharp được nạp bằng `require` thật lúc chạy (xem lib/google/anh-web.server.ts)
  // nên bộ dò tệp của Next không nhìn thấy nó qua đường import — khai rõ để gói
  // hàm trên Vercel mang theo sharp và gói nhị phân cho Linux (`@img/*`).
  outputFileTracingIncludes: {
    /**
     * Khoá `"/*"` là khoá TOÀN CỤC (tài liệu Next: "target all routes using a
     * global key like '/*'"), không phải một đoạn đường dẫn.
     *
     * Hai nhóm tệp, cùng một lý do: bộ dò tệp của Next đi theo `import`, mà cả
     * hai thứ này đều được nạp bằng đường khác nên nó không thấy.
     * - `sharp`: nạp bằng `require` thật lúc chạy (lib/google/anh-web.server.ts).
     * - CSS gốc của Tailwind: bộ xem thử đọc bằng `fs` lúc chạy
     *   (lib/dung-web/ve-trang-tinh.ts).
     *
     * ⚠️ CSS Tailwind CỐ Ý khai toàn cục, không khai riêng cho tuyến xem thử.
     * Khai riêng thì mỗi tuyến một dòng, mà phép tự kiểm
     * (`/api/v1/health?kiem=xem-truoc`) lại nằm ở tuyến KHÁC — nó sẽ báo xanh
     * bằng dòng của chính nó trong khi tuyến xem thử thật đang hỏng vì dòng
     * kia sai. Dùng chung một dòng thì phép tự kiểm hỏng đúng lúc thật hỏng.
     * Bốn tệp CSS cộng lại khoảng 100 KB — không đáng để đánh đổi lấy rủi ro ấy.
     */
    "/*": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/**/*",
      "./node_modules/detect-libc/**/*",
      "./node_modules/semver/**/*",
      "./node_modules/tailwindcss/*.css",
      "./node_modules/tailwindcss/package.json",
    ],
  },
  /**
   * Header bảo mật cho MỌI đường dẫn.
   *
   * Đo trang thật trên Vercel ngày 18/09/2026: chỉ có `Strict-Transport-Security`
   * (Vercel tự thêm) — không có gì chống nhúng iframe, không `nosniff`, không
   * `Referrer-Policy`. Đây là ứng dụng CÓ ĐĂNG NHẬP và giữ khoá AI của người
   * dùng, nên chống nhúng (clickjacking) không phải tuỳ chọn.
   *
   * Cố ý CHƯA có Content-Security-Policy: Next chèn script nội tuyến, CSP đúng
   * cách cần nonce theo từng yêu cầu (middleware) — làm sau, riêng một vòng,
   * có kiểm. Bốn header dưới không có tác dụng phụ nào lên giao diện.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Bản xem thử website khách SINH RA để nằm trong iframe của chính
        // Antigravity — luật sau ghi đè luật trước cho cùng một header.
        source: "/api/v1/projects/:projectId/dung-web/xem-truoc/trang/:duong*",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
});

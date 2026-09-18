import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // sharp được nạp bằng `require` thật lúc chạy (xem lib/google/anh-web.server.ts)
  // nên bộ dò tệp của Next không nhìn thấy nó qua đường import — khai rõ để gói
  // hàm trên Vercel mang theo sharp và gói nhị phân cho Linux (`@img/*`).
  outputFileTracingIncludes: {
    "/*": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*", "./node_modules/detect-libc/**/*", "./node_modules/semver/**/*"],
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
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
});

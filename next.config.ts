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
};

export default withSentryConfig(nextConfig, {
  silent: true,
});

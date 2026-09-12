import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  // 30 giây, không phải 15: máy chủ dev biên dịch từng trang lần đầu (ổ đĩa
  // chậm — Next tự cảnh báo), nên lần đăng nhập ĐẦU TIÊN của mỗi lượt chạy
  // mất 10–12 giây trước khi tới /bat-dau. 15 giây làm hai phép thử hỏng giả
  // ngày 13/09 rồi tự đạt khi chạy lại.
  expect: { timeout: 30_000 },
  use: {
    baseURL: "http://127.0.0.1:3100",
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm.cmd run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/api/v1/health",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      DATABASE_URL: path.resolve(".data", "e2e.db"),
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
});

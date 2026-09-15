import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "list",
  // 180 giây mỗi phép thử: lần mở đầu của một trang nặng (/pipelines) trên ổ
  // đĩa chậm biên dịch quá 60 giây → hỏng giả, chạy lại đạt (13/09 hai lần,
  // 15/09 hai lần nữa). 120 vẫn chưa đủ khi cache `.next` bị một lượt
  // `next build` xoá ngay trước đó.
  timeout: 180_000,
  // 30 giây, không phải 15: máy chủ dev biên dịch từng trang lần đầu (ổ đĩa
  // chậm — Next tự cảnh báo), nên lần đăng nhập ĐẦU TIÊN của mỗi lượt chạy
  // mất 10–12 giây trước khi tới /bat-dau. 15 giây làm hai phép thử hỏng giả
  // ngày 13/09 rồi tự đạt khi chạy lại.
  expect: { timeout: 30_000 },
  use: {
    baseURL: "http://127.0.0.1:3100",
    // 90 giây: lượt điều hướng ĐẦU TIÊN của một lượt chạy phải đợi máy chủ dev
    // biên dịch trang đó. `/dashboard` mất hơn 60 giây ngày 15/09 (cache nguội
    // sau `next build`) — cả phép thử đỏ vì đúng một lần biên dịch.
    navigationTimeout: 90_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm.cmd run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/api/v1/health",
    reuseExistingServer: false,
    // 240 giây, không phải 120: `next build` và `next dev` dùng chung thư mục
    // `.next`, nên chạy e2e NGAY SAU một lượt build là máy chủ dev phải biên
    // dịch lại từ đầu trên ổ đĩa chậm (Next tự in "Slow filesystem detected").
    // Ngày 15/09 lượt đó mất quá 120 giây → "Timed out waiting for
    // config.webServer", cả bộ đỏ mà không phép thử nào chạy.
    timeout: 240_000,
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

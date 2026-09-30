import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Xem `tests/gia-lap/server-only.ts`: rào chắn của gói thật là rào lúc
      // DỰNG; giữ nó khi chạy phép thử chỉ làm mọi tệp `*.server.ts` không
      // kiểm được. `next build` vẫn dùng gói thật.
      "server-only": fileURLToPath(new URL("./tests/gia-lap/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
    fileParallelism: false,
    maxWorkers: 1,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/domain/**/*.ts",
        "src/infrastructure/automation/**/*.ts",
        "src/infrastructure/config/**/*.ts",
        "src/infrastructure/events/**/*.ts",
        "src/infrastructure/security/**/*.ts",
        "src/infrastructure/storage/**/*.ts",
        "src/lib/vault.ts",
      ],
    },
  },
});

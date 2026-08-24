import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
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

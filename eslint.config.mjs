import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Thư mục nháp: các tệp gỡ lỗi dùng một lần, đã gỡ khỏi kho ở 10a4f49
    // nhưng eslint vẫn quét theo đĩa chứ không theo git. Một tệp nháp làm đỏ
    // cổng lint của cả kho là lý do người ta bắt đầu chạy lint kèm --no-verify.
    ".tmp/**",
  ]),
]);

export default eslintConfig;

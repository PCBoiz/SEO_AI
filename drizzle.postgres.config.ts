import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/postgres-schema.ts",
  out: "./drizzle-postgres",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://app_placeholder:app_placeholder@localhost:5432/app_placeholder",
  },
});

import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.BRIDGE_DATABASE_URL;

export default defineConfig({
  schema: "./src/lib/db/bridge-schema.ts",
  out: "./drizzle-bridge",
  dialect: "postgresql",
  dbCredentials: {
    url:
      databaseUrl ??
      "postgresql://bridge_placeholder:bridge_placeholder@localhost:5432/bridge_placeholder",
  },
});

import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it } from "vitest";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("Phase 1 SQLite migration", () => {
  it("migrates a fresh database with integrity and foreign keys intact", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "antigravity-db-"));
    temporaryDirectories.push(root);
    const adapter = new SqliteDatabaseAdapter(path.join(root, "test.db"));

    try {
      migrate(adapter.db, { migrationsFolder: path.resolve("drizzle") });
      const tableRows = adapter.client
        .prepare(
          "select name from sqlite_master where type = 'table' and name not like 'sqlite_%'",
        )
        .all() as Array<{ name: string }>;
      const tableNames = new Set(tableRows.map(({ name }) => name));

      expect(adapter.isReady()).toBe(true);
      expect(tableNames).toEqual(
        expect.objectContaining(
          new Set([
            "users",
            "workspace_members",
            "capabilities",
            "project_integrations",
            "processed_events",
            "resource_locks",
            "content_revisions",
            "prompt_runs",
            "knowledge_base",
            "feature_flags",
            "sitemap_pilot_jobs",
            "auth_accounts",
            "oauth_connections",
            "ai_test_runs",
          ]),
        ),
      );
      expect(adapter.client.pragma("integrity_check", { simple: true })).toBe("ok");
      expect(adapter.client.pragma("foreign_key_check")).toHaveLength(0);
    } finally {
      adapter.close();
    }
  });
});

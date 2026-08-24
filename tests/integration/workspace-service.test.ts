import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it } from "vitest";
import { WorkspaceService } from "@/application/workspaces/workspace-service";
import { AuthorizationError } from "@/domain/shared/app-error";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";
import { SqliteWorkspaceRepository } from "@/infrastructure/workspaces/sqlite-workspace-repository";
import { users, workspaceMembers, workspaces } from "@/lib/db/schema";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("workspace service with SQLite", () => {
  it("allows owners to persist settings and keeps editors read-only", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "antigravity-workspace-"));
    temporaryDirectories.push(root);
    const adapter = new SqliteDatabaseAdapter(path.join(root, "test.db"));
    migrate(adapter.db, { migrationsFolder: path.resolve("drizzle") });
    const now = new Date();
    adapter.db.transaction((transaction) => {
      transaction.insert(workspaces).values({ id: "workspace", name: "Before", slug: "before-workspace", createdAt: now, updatedAt: now }).run();
      transaction.insert(users).values({ id: "owner", email: "owner@example.test", displayName: "Owner", passwordHash: "test", status: "active", createdAt: now, updatedAt: now }).run();
      transaction.insert(workspaceMembers).values({ workspaceId: "workspace", userId: "owner", role: "owner", createdAt: now, updatedAt: now }).run();
    });
    const service = new WorkspaceService(
      new SqliteWorkspaceRepository(adapter.db),
    );
    const owner = {
      userId: "owner",
      workspaceId: "workspace",
      role: "owner" as const,
    };

    try {
      await expect(
        service.update(owner, { name: "After", slug: "after-workspace" }),
      ).resolves.toMatchObject({
        name: "After",
        slug: "after-workspace",
        members: [{ role: "owner" }],
      });
      await expect(
        service.update(
          { ...owner, role: "editor" },
          { name: "Denied", slug: "denied-workspace" },
        ),
      ).rejects.toBeInstanceOf(AuthorizationError);
      expect(
        adapter.client.prepare("select count(*) count from audit_logs").get(),
      ).toEqual({ count: 1 });
    } finally {
      adapter.close();
    }
  });
});

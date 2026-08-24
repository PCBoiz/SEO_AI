import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectService } from "@/application/projects/project-service";
import { AuthorizationError } from "@/domain/shared/app-error";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";
import { SqliteProjectRepository } from "@/infrastructure/projects/sqlite-project-repository";
import { users, workspaceMembers, workspaces } from "@/lib/db/schema";
import { Vault } from "@/lib/vault";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("project service with SQLite", () => {
  it("persists workspace-scoped projects, competitors, audit data, and encrypted credentials", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "antigravity-project-"));
    temporaryDirectories.push(root);
    const adapter = new SqliteDatabaseAdapter(path.join(root, "test.db"));
    migrate(adapter.db, { migrationsFolder: path.resolve("drizzle") });
    seedIdentity(adapter);

    const key = Buffer.alloc(32, 7).toString("hex");
    const vault = new Vault(key);
    const service = new ProjectService(
      new SqliteProjectRepository(adapter.db),
      vault,
    );
    const editor = {
      userId: "user_editor",
      workspaceId: "workspace_one",
      role: "editor" as const,
    };

    try {
      const created = await service.create(editor, {
        name: "Acme SEO",
        website: "https://example.com/",
        location: "Ho Chi Minh City",
        industry: "SaaS",
        language: "English",
        tone: "Professional",
        competitors: [{ domain: "competitor.com", priority: 4 }],
        wordpress: {
          url: "https://blog.example.com",
          username: "publisher",
          password: "not-stored-in-plaintext",
        },
      });

      expect(created).toMatchObject({
        name: "Acme SEO",
        website: "https://example.com",
        competitors: [{ domain: "competitor.com", priority: 4 }],
        integrations: {
          wordpress: {
            status: "configured",
            url: "https://blog.example.com",
            username: "publisher",
          },
          googleSheetBridge: { status: "unconfigured" },
        },
      });

      const credential = adapter.client
        .prepare(
          "select encrypted_credentials as encryptedCredentials from project_integrations where project_id = ? and type = 'wordpress'",
        )
        .get(created.id) as { encryptedCredentials: string };
      expect(credential.encryptedCredentials).toMatch(/^v1:/);
      expect(credential.encryptedCredentials).not.toContain(
        "not-stored-in-plaintext",
      );
      expect(
        vault.decrypt(
          credential.encryptedCredentials,
          `workspace:workspace_one:project:${created.id}:wordpress`,
        ),
      ).toBe("not-stored-in-plaintext");

      const updated = await service.update(editor, created.id, {
        name: "Acme SEO Updated",
        website: "https://updated.example.com",
        location: "Da Nang",
        industry: "Technology",
        language: "Vietnamese",
        tone: "Engaging",
        competitors: [{ domain: "new-competitor.com", priority: 5 }],
        wordpress: {
          url: "https://new-blog.example.com",
          username: "new-publisher",
        },
      });
      expect(updated).toMatchObject({
        name: "Acme SEO Updated",
        competitors: [{ domain: "new-competitor.com", priority: 5 }],
        integrations: {
          wordpress: {
            status: "configured",
            url: "https://new-blog.example.com",
            username: "new-publisher",
          },
        },
      });
      const credentialAfterMetadataUpdate = adapter.client
        .prepare(
          "select encrypted_credentials as encryptedCredentials from project_integrations where project_id = ? and type = 'wordpress'",
        )
        .get(created.id) as { encryptedCredentials: string };
      expect(credentialAfterMetadataUpdate.encryptedCredentials).toBe(
        credential.encryptedCredentials,
      );

      await expect(service.list(editor)).resolves.toHaveLength(1);
      await expect(
        service.list({ ...editor, workspaceId: "workspace_two" }),
      ).resolves.toEqual([]);
      await expect(
        service.create({ ...editor, role: "viewer" }, {
          name: "Forbidden",
          website: "https://forbidden.example",
          language: "English",
          tone: "Professional",
        }),
      ).rejects.toBeInstanceOf(AuthorizationError);
      await expect(
        service.update({ ...editor, role: "viewer" }, created.id, {}),
      ).rejects.toBeInstanceOf(AuthorizationError);
      await expect(service.archive(editor, created.id)).rejects.toBeInstanceOf(
        AuthorizationError,
      );

      const archived = await service.archive(
        { ...editor, role: "owner" },
        created.id,
      );
      expect(archived.status).toBe("archived");
      expect(
        adapter.client
          .prepare("select count(*) as count from audit_logs")
          .get(),
      ).toEqual({ count: 3 });
    } finally {
      adapter.close();
    }
  });
});

function seedIdentity(adapter: SqliteDatabaseAdapter): void {
  const now = new Date();
  adapter.db.transaction((transaction) => {
    transaction
      .insert(workspaces)
      .values([
        {
          id: "workspace_one",
          name: "Workspace One",
          slug: "workspace-one",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "workspace_two",
          name: "Workspace Two",
          slug: "workspace-two",
          createdAt: now,
          updatedAt: now,
        },
      ])
      .run();
    transaction
      .insert(users)
      .values({
        id: "user_editor",
        email: "editor@example.test",
        displayName: "Editor",
        passwordHash: "test-only",
        status: "active",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    transaction
      .insert(workspaceMembers)
      .values({
        workspaceId: "workspace_one",
        userId: "user_editor",
        role: "editor",
        createdAt: now,
        updatedAt: now,
      })
      .run();
  });
}

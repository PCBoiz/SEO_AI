import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SitemapPilotService } from "@/application/sitemap/sitemap-pilot-service";
import { AuthorizationError } from "@/domain/shared/app-error";
import type { AutomationProvider } from "@/domain/automation/automation-provider";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";
import { SqliteProjectRepository } from "@/infrastructure/projects/sqlite-project-repository";
import { SqliteSitemapPilotJobRepository } from "@/infrastructure/sitemap/sqlite-sitemap-pilot-job-repository";
import { projects, workspaces } from "@/lib/db/schema";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("SitemapPilotService", () => {
  it("lưu mock output và không dispatch lại cùng khóa idempotency", async () => {
    const adapter = await createDatabase();
    const trigger = vi.fn<AutomationProvider["trigger"]>(
      async (jobId, nodeId) => ({
        jobId,
        nodeId,
        status: "success",
        outputData: {
          contractVersion: "1.0",
          mocked: true,
          sites: [
            {
              reference: "site-1",
              draftSitemap: "Trang chủ\nDịch vụ",
              selectedSitemap: "Trang chủ",
            },
          ],
        },
      }),
    );
    const service = new SitemapPilotService(
      new SqliteSitemapPilotJobRepository(adapter.db),
      new SqliteProjectRepository(adapter.db),
      { id: "mock", trigger },
    );
    const actor = {
      userId: "editor",
      workspaceId: "workspace",
      role: "editor" as const,
    };
    const input = validInput();

    try {
      const first = await service.create(actor, input);
      const duplicate = await service.create(actor, input);
      expect(first.status).toBe("succeeded");
      expect(first.output?.mocked).toBe(true);
      expect(duplicate.id).toBe(first.id);
      expect(trigger).toHaveBeenCalledTimes(1);
      await expect(
        service.create(actor, {
          ...input,
          sites: [{ ...input.sites[0], primaryKeyword: "payload khác" }],
        }),
      ).rejects.toMatchObject({
        code: "IDEMPOTENCY_KEY_REUSED",
        status: 409,
      });
      await expect(service.get(actor, first.id)).resolves.toMatchObject({
        id: first.id,
        workspaceId: "workspace",
      });
    } finally {
      adapter.close();
    }
  });

  it("không cho viewer tạo job", async () => {
    const adapter = await createDatabase();
    const service = new SitemapPilotService(
      new SqliteSitemapPilotJobRepository(adapter.db),
      new SqliteProjectRepository(adapter.db),
      { id: "mock", trigger: vi.fn() },
    );
    try {
      await expect(
        service.create(
          {
            userId: "viewer",
            workspaceId: "workspace",
            role: "viewer",
          },
          validInput(),
        ),
      ).rejects.toBeInstanceOf(AuthorizationError);
    } finally {
      adapter.close();
    }
  });

  it("khóa canary Make nếu thiếu xác nhận chi phí hoặc dùng AI ngoài allowlist", async () => {
    const adapter = await createDatabase();
    const trigger = vi.fn<AutomationProvider["trigger"]>(
      async (jobId, nodeId) => ({ jobId, nodeId, status: "pending" }),
    );
    const service = new SitemapPilotService(
      new SqliteSitemapPilotJobRepository(adapter.db),
      new SqliteProjectRepository(adapter.db),
      { id: "make", trigger },
      {
        allowedAiProviders: ["deepseek"],
        maxSites: 1,
        requireCostConfirmation: true,
      },
    );
    const actor = {
      userId: "owner",
      workspaceId: "workspace",
      role: "owner" as const,
    };

    try {
      // Không còn bước xác nhận chi phí: rào chắn thật là chính sách provider
      // phía server + key hợp lệ trong trang API Keys.
      await expect(
        service.create(actor, {
          ...validInput(),
          ai: { provider: "openai", model: "test-model" },
        }),
      ).rejects.toMatchObject({ code: "SITEMAP_AI_PROVIDER_NOT_ALLOWED" });

      const job = await service.create(actor, validInput());
      expect(job.status).toBe("dispatching");
      expect(trigger).toHaveBeenCalledTimes(1);
    } finally {
      adapter.close();
    }
  });
});

async function createDatabase(): Promise<SqliteDatabaseAdapter> {
  const root = await mkdtemp(path.join(os.tmpdir(), "antigravity-sitemap-"));
  temporaryDirectories.push(root);
  const adapter = new SqliteDatabaseAdapter(path.join(root, "test.db"));
  migrate(adapter.db, { migrationsFolder: path.resolve("drizzle") });
  const now = new Date();
  adapter.db
    .insert(workspaces)
    .values({
      id: "workspace",
      name: "Workspace",
      slug: "workspace",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  adapter.db
    .insert(projects)
    .values({
      id: "project",
      workspaceId: "workspace",
      name: "Dự án",
      website: "https://example.com",
      language: "Tiếng Việt",
      tone: "Chuyên nghiệp",
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return adapter;
}

function validInput() {
  return {
    projectId: "project",
    idempotencyKey: "188e9d79-82a7-4e55-9f5f-b1882e050def",
    ai: { provider: "deepseek" as const, model: "deepseek-v4-flash" },
    sites: [
      {
        reference: "site-1",
        location: "Việt Nam",
        primaryKeyword: "dịch vụ SEO",
        tone: "Chuyên nghiệp",
        language: "Tiếng Việt",
        websiteBrief: "Website cung cấp dịch vụ SEO cho doanh nghiệp Việt Nam.",
        competitorUrls: ["https://competitor.example"],
      },
    ],
  };
}

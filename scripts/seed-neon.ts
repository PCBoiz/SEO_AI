import { randomBytes } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { z } from "zod";
import { NeonDatabaseAdapter, type NeonApplicationDatabase } from "@/infrastructure/database/neon-adapter";
import { hashPassword } from "@/infrastructure/auth/password";
import {
  pgKnowledgeBase,
  pgProjectIntegrations,
  pgProjects,
  pgPromptVersions,
  pgPrompts,
  pgUsers,
  pgWorkspaceMembers,
  pgWorkspaces,
} from "@/lib/db/postgres-schema";

loadEnvConfig(process.cwd());

const environmentSchema = z.object({
  DATABASE_URL: z.string().regex(/^postgres(?:ql)?:\/\//i),
  STAGING_OWNER_EMAIL: z.email().trim().toLowerCase(),
  STAGING_OWNER_DISPLAY_NAME: z.string().trim().min(1).default("Chủ sở hữu Staging"),
});

async function seedNeon(): Promise<void> {
  const environment = environmentSchema.parse(process.env);
  const database = new NeonDatabaseAdapter(environment.DATABASE_URL).db;
  const now = new Date();
  const lockedPasswordHash = await hashPassword(
    `${randomBytes(48).toString("base64url")}!Aa1`,
  );
  const queries: unknown[] = [];

  queries.push(
    database
      .insert(pgWorkspaces)
      .values({
        id: "workspace_staging",
        name: "Antigravity Automation Staging",
        slug: "antigravity-automation-staging",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: pgWorkspaces.id,
        set: {
          name: "Antigravity Automation Staging",
          updatedAt: now,
        },
      }),
    database
      .insert(pgUsers)
      .values({
        id: "user_staging_owner",
        email: environment.STAGING_OWNER_EMAIL,
        displayName: environment.STAGING_OWNER_DISPLAY_NAME,
        passwordHash: lockedPasswordHash,
        status: "active",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: pgUsers.id,
        set: {
          email: environment.STAGING_OWNER_EMAIL,
          displayName: environment.STAGING_OWNER_DISPLAY_NAME,
          status: "active",
          updatedAt: now,
        },
      }),
    database
      .insert(pgWorkspaceMembers)
      .values({
        workspaceId: "workspace_staging",
        userId: "user_staging_owner",
        role: "owner",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [pgWorkspaceMembers.workspaceId, pgWorkspaceMembers.userId],
        set: { role: "owner", updatedAt: now },
      }),
  );

  queries.push(
    database
      .insert(pgProjects)
      .values({
        id: "project_staging_demo",
        workspaceId: "workspace_staging",
        name: "Dự án SEO staging",
        website: "https://example.com",
        location: "Việt Nam",
        industry: "Dự án mẫu",
        language: "Tiếng Việt",
        tone: "Chuyên nghiệp",
        status: "active",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: pgProjects.id,
        set: {
          name: "Dự án SEO staging",
          location: "Việt Nam",
          language: "Tiếng Việt",
          tone: "Chuyên nghiệp",
          updatedAt: now,
        },
      }),
    database
      .insert(pgProjectIntegrations)
      .values([
        {
          id: "integration_staging_demo_wordpress",
          projectId: "project_staging_demo",
          type: "wordpress",
          status: "unconfigured",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "integration_staging_demo_sheet",
          projectId: "project_staging_demo",
          type: "google_sheet_bridge",
          status: "unconfigured",
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing(),
  );

  queries.push(
    database
      .insert(pgKnowledgeBase)
      .values({
        id: "knowledge_staging_brand_voice",
        projectId: "project_staging_demo",
        title: "Mẫu giọng thương hiệu",
        type: "text",
        content:
          "Dữ liệu mẫu staging. Không gửi tới mô hình ngoài khi chưa xác nhận chi phí.",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: pgKnowledgeBase.id,
        set: { updatedAt: now },
      }),
    database
      .insert(pgPrompts)
      .values({
        id: "prompt_staging_outline",
        projectId: "project_staging_demo",
        name: "Mẫu dàn ý nội dung",
        description: "Prompt mẫu staging có quản lý phiên bản.",
        variables: ["primaryKeyword", "tone"],
        currentVersion: 1,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: pgPrompts.id,
        set: { updatedAt: now },
      }),
    database
      .insert(pgPromptVersions)
      .values({
        id: "prompt_version_staging_outline_1",
        promptId: "prompt_staging_outline",
        version: 1,
        content: "Tạo dàn ý cho {primaryKeyword} với giọng văn {tone}.",
        createdAt: now,
        createdBy: "user_staging_owner",
      })
      .onConflictDoUpdate({
        target: pgPromptVersions.id,
        set: { content: "Tạo dàn ý cho {primaryKeyword} với giọng văn {tone}." },
      }),
  );

  await runBatch(database, queries);
  console.log("Seeded Neon staging workspace and OAuth-only owner account.");
}

async function runBatch(
  database: NeonApplicationDatabase,
  queries: unknown[],
): Promise<void> {
  await database.batch(
    queries as unknown as Parameters<NeonApplicationDatabase["batch"]>[0],
  );
}

void seedNeon();

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { hashPassword } from "@/infrastructure/auth/password";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";
import {
  knowledgeBase,
  projectIntegrations,
  projects,
  prompts,
  promptVersions,
  users,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";

loadEnvConfig(process.cwd());

interface SeedOptions {
  databaseUrl?: string;
  credentialsPath?: string;
}

const accounts = [
  {
    id: "user_local_owner",
    email: "owner@local.antigravity",
    displayName: "Chủ sở hữu Local",
    role: "owner" as const,
  },
  {
    id: "user_local_editor",
    email: "editor@local.antigravity",
    displayName: "Biên tập viên Local",
    role: "editor" as const,
  },
  {
    id: "user_local_viewer",
    email: "viewer@local.antigravity",
    displayName: "Tài khoản chỉ xem Local",
    role: "viewer" as const,
  },
];

export async function seedLocalData(
  options: SeedOptions = {},
): Promise<void> {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL ?? "local.db";
  const adapter = new SqliteDatabaseAdapter(databaseUrl);
  const now = new Date();
  const credentials = await Promise.all(
    accounts.map(async (account) => {
      const password = `${randomBytes(24).toString("base64url")}!Aa1`;
      return {
        ...account,
        password,
        passwordHash: await hashPassword(password),
      };
    }),
  );

  try {
    adapter.db.transaction((transaction) => {
    transaction
      .insert(workspaces)
      .values({
        id: "workspace_local",
        name: "Antigravity Local",
        slug: "antigravity-local",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: workspaces.id,
        set: { name: "Antigravity Local", updatedAt: now },
      })
      .run();

    for (const credential of credentials) {
      transaction
        .insert(users)
        .values({
          id: credential.id,
          email: credential.email,
          displayName: credential.displayName,
          passwordHash: credential.passwordHash,
          status: "active",
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: credential.email,
            displayName: credential.displayName,
            passwordHash: credential.passwordHash,
            status: "active",
            updatedAt: now,
          },
        })
        .run();

      transaction
        .insert(workspaceMembers)
        .values({
          workspaceId: "workspace_local",
          userId: credential.id,
          role: credential.role,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [workspaceMembers.workspaceId, workspaceMembers.userId],
          set: { role: credential.role, updatedAt: now },
        })
        .run();
    }

    transaction
      .insert(projects)
      .values({
        id: "project_local_demo",
        workspaceId: "workspace_local",
        name: "Dự án SEO mẫu",
        website: "https://example.local",
        location: "Việt Nam",
        industry: "Dự án mẫu",
        language: "Tiếng Việt",
        tone: "Chuyên nghiệp",
        status: "active",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: projects.id,
        set: {
          name: "Dự án SEO mẫu",
          location: "Việt Nam",
          industry: "Dự án mẫu",
          language: "Tiếng Việt",
          tone: "Chuyên nghiệp",
          updatedAt: now,
        },
      })
      .run();
    transaction
      .insert(projectIntegrations)
      .values([
        {
          id: "integration_local_demo_wordpress",
          projectId: "project_local_demo",
          type: "wordpress",
          status: "unconfigured",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "integration_local_demo_sheet",
          projectId: "project_local_demo",
          type: "google_sheet_bridge",
          status: "unconfigured",
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing()
      .run();
    transaction
      .insert(knowledgeBase)
      .values({
        id: "knowledge_local_brand_voice",
        projectId: "project_local_demo",
        title: "Mẫu giọng thương hiệu",
        type: "text",
        content:
          "Dữ liệu mẫu local cho bối cảnh giọng thương hiệu. Nội dung không được gửi tới mô hình bên ngoài.",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: knowledgeBase.id,
        set: {
          title: "Mẫu giọng thương hiệu",
          content:
            "Dữ liệu mẫu local cho bối cảnh giọng thương hiệu. Nội dung không được gửi tới mô hình bên ngoài.",
          updatedAt: now,
        },
      })
      .run();
    transaction
      .insert(prompts)
      .values({
        id: "prompt_local_outline",
        projectId: "project_local_demo",
        name: "Mẫu dàn ý nội dung",
        description: "Mẫu quản lý phiên bản prompt được lưu local.",
        variables: ["primaryKeyword", "tone"],
        currentVersion: 1,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: prompts.id,
        set: {
          name: "Mẫu dàn ý nội dung",
          description: "Mẫu quản lý phiên bản prompt được lưu local.",
          updatedAt: now,
        },
      })
      .run();
    transaction
      .insert(promptVersions)
      .values({
        id: "prompt_version_local_outline_1",
        promptId: "prompt_local_outline",
        version: 1,
        content:
          "Tạo dàn ý local cho {primaryKeyword} với giọng văn {tone}.",
        createdAt: now,
        createdBy: "user_local_owner",
      })
      .onConflictDoUpdate({
        target: promptVersions.id,
        set: {
          content: "Tạo dàn ý local cho {primaryKeyword} với giọng văn {tone}.",
        },
      })
      .run();
    });

  const credentialsPath = path.resolve(
    options.credentialsPath ?? ".data/seed-credentials.json",
  );
  await mkdir(path.dirname(credentialsPath), { recursive: true });
  await writeFile(
    credentialsPath,
    `${JSON.stringify(
      {
        generatedAt: now.toISOString(),
        workspace: "Antigravity Local",
        accounts: credentials.map(({ email, displayName, role, password }) => ({
          email,
          displayName,
          role,
          password,
        })),
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", mode: 0o600 },
  );

    console.log(
      `Seeded local accounts, demo project, and knowledge placeholders. Credentials were written to ${path.relative(process.cwd(), credentialsPath)}.`,
    );
  } finally {
    adapter.close();
  }
}

if (process.env.ANTIGRAVITY_SEED_LIBRARY !== "1") {
  void seedLocalData();
}

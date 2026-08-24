import "server-only";

import { and, eq } from "drizzle-orm";
import { wordpressCredentialContext } from "@/application/projects/project-service";
import { databaseAdapter } from "@/lib/db";
import { pgProjectIntegrations, pgProjects } from "@/lib/db/postgres-schema";
import { projectIntegrations, projects } from "@/lib/db/schema";
import { Vault } from "@/lib/vault";

export interface WordpressCredentials {
  url: string;
  username: string;
  password: string;
}

// Đọc + giải mã thông tin WordPress của dự án (per-project, vault AES-256-GCM).
// Password chỉ tồn tại trong bộ nhớ server trong lúc đăng bài — không log, không
// trả về client. Trả null nếu dự án chưa cấu hình WordPress.
export async function getWordpressCredentials(
  workspaceId: string,
  projectId: string,
): Promise<WordpressCredentials | null> {
  const key = process.env.VAULT_ENCRYPTION_KEY?.trim();
  if (!key) return null;

  const row =
    databaseAdapter.kind === "neon"
      ? (
          await databaseAdapter.db
            .select({
              config: pgProjectIntegrations.config,
              encryptedCredentials: pgProjectIntegrations.encryptedCredentials,
              status: pgProjectIntegrations.status,
            })
            .from(pgProjectIntegrations)
            .innerJoin(
              pgProjects,
              eq(pgProjects.id, pgProjectIntegrations.projectId),
            )
            .where(
              and(
                eq(pgProjects.workspaceId, workspaceId),
                eq(pgProjectIntegrations.projectId, projectId),
                eq(pgProjectIntegrations.type, "wordpress"),
              ),
            )
            .limit(1)
        )[0]
      : (
          await databaseAdapter.db
            .select({
              config: projectIntegrations.config,
              encryptedCredentials: projectIntegrations.encryptedCredentials,
              status: projectIntegrations.status,
            })
            .from(projectIntegrations)
            .innerJoin(projects, eq(projects.id, projectIntegrations.projectId))
            .where(
              and(
                eq(projects.workspaceId, workspaceId),
                eq(projectIntegrations.projectId, projectId),
                eq(projectIntegrations.type, "wordpress"),
              ),
            )
            .limit(1)
        )[0];

  if (!row || row.status !== "configured" || !row.encryptedCredentials) {
    return null;
  }
  const config = (row.config ?? {}) as { url?: string; username?: string };
  if (!config.url || !config.username) return null;

  const password = new Vault(key).decrypt(
    row.encryptedCredentials,
    wordpressCredentialContext(workspaceId, projectId),
  );
  return { url: config.url, username: config.username, password };
}

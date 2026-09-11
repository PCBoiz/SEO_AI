import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@/domain/shared/app-error";
import { databaseAdapter } from "@/lib/db";
import { pgProjectIntegrations, pgProjects } from "@/lib/db/postgres-schema";
import { projectIntegrations, projects } from "@/lib/db/schema";
import { Vault } from "@/lib/vault";

// Tích hợp mạng xã hội / nền tảng ngoài theo DỰ ÁN (quyết định owner): config
// không nhạy cảm (page id, location id...) lưu JSON; token lưu mã hoá vault
// AES-256-GCM với AAD riêng từng (workspace, project, loại). Token không bao giờ
// trả về browser — chỉ status + config.

// ⚠️ TÊN "social" GIỜ HẸP HƠN THỨ DANH SÁCH NÀY CHỨA.
//
// Ban đầu nó chỉ gồm mạng xã hội. Nay có thêm `custom_site` — trang tự code
// nhận bài qua một cổng HTTP có khoá. Cùng một cơ chế: cấu hình không nhạy cảm
// lưu JSON, bí mật mã hoá vault theo (workspace, project, loại).
//
// Giữ nguyên tên vì đổi nó chạm 23 chỗ trong bảy tệp, mà không đổi được hành vi
// nào. Ghi lại ở đây để người đọc sau không kết luận nhầm rằng chỗ này chỉ dành
// cho mạng xã hội rồi đi dựng một cơ chế thứ hai song song.
/**
 * Loại tích hợp NGƯỜI DÙNG TỰ GHI được qua `PUT /integrations/[type]`.
 *
 * ⚠️ `lead_sheet` CỐ Ý KHÔNG NẰM Ở ĐÂY. Danh sách này là cổng vào của route
 * chung — ai có quyền `pipeline.run` đều ghi được config + bí mật tuỳ ý. Với
 * `lead_sheet` thì config chứa `userId` (token Google của AI dùng để ghi) và
 * `spreadsheetId` (ghi vào ĐÂU). Để nó ở đây là một biên tập viên đổi được hai
 * giá trị đó, và token của chủ dự án sẽ ghi khách vào một bảng khác. Bảng khách
 * chỉ được lập qua `lapBangKhach`, nơi hai giá trị đó do máy chủ tự điền.
 */
export const socialIntegrationTypes = [
  "facebook",
  "zalo",
  "google_business",
  "custom_site",
] as const;
export type SocialIntegrationType = (typeof socialIntegrationTypes)[number];

/** Mọi loại lưu chung bảng `project_integrations`, kể cả loại nội bộ. */
export type LoaiTichHopLuu = SocialIntegrationType | "lead_sheet" | "drive_folder" | "lich_dang";

export function integrationCredentialContext(
  workspaceId: string,
  projectId: string,
  type: LoaiTichHopLuu,
): string {
  return `workspace:${workspaceId}:project:${projectId}:integration:${type}`;
}

function getVault(): Vault {
  const key = process.env.VAULT_ENCRYPTION_KEY?.trim();
  if (!key) {
    throw new ValidationError(
      "VAULT_KEY_MISSING",
      "Server chưa cấu hình VAULT_ENCRYPTION_KEY.",
    );
  }
  return new Vault(key);
}

async function assertProjectInWorkspace(
  workspaceId: string,
  projectId: string,
): Promise<void> {
  const rows =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({ id: pgProjects.id })
          .from(pgProjects)
          .where(
            and(
              eq(pgProjects.id, projectId),
              eq(pgProjects.workspaceId, workspaceId),
            ),
          )
          .limit(1)
      : await databaseAdapter.db
          .select({ id: projects.id })
          .from(projects)
          .where(
            and(
              eq(projects.id, projectId),
              eq(projects.workspaceId, workspaceId),
            ),
          )
          .limit(1);
  if (!rows[0]) {
    throw new NotFoundError(
      "PROJECT_NOT_FOUND",
      "Không tìm thấy dự án trong workspace hiện tại.",
      { projectId },
    );
  }
}

export async function setSocialIntegration(
  workspaceId: string,
  projectId: string,
  type: LoaiTichHopLuu,
  config: Record<string, string>,
  secret: string,
): Promise<void> {
  await assertProjectInWorkspace(workspaceId, projectId);
  if (!secret.trim()) {
    throw new ValidationError(
      "INTEGRATION_SECRET_REQUIRED",
      "Token/khoá truy cập không được để trống.",
    );
  }
  const encrypted = getVault().encrypt(
    secret.trim(),
    integrationCredentialContext(workspaceId, projectId, type),
  );
  const now = new Date();
  const values = {
    id: randomUUID(),
    projectId,
    type,
    status: "configured" as const,
    config,
    encryptedCredentials: encrypted,
    createdAt: now,
    updatedAt: now,
  };
  if (databaseAdapter.kind === "neon") {
    await databaseAdapter.db
      .insert(pgProjectIntegrations)
      .values(values)
      .onConflictDoUpdate({
        target: [pgProjectIntegrations.projectId, pgProjectIntegrations.type],
        set: {
          status: "configured",
          config,
          encryptedCredentials: encrypted,
          updatedAt: now,
        },
      });
  } else {
    databaseAdapter.db
      .insert(projectIntegrations)
      .values(values)
      .onConflictDoUpdate({
        target: [projectIntegrations.projectId, projectIntegrations.type],
        set: {
          status: "configured",
          config,
          encryptedCredentials: encrypted,
          updatedAt: now,
        },
      })
      .run();
  }
}

export interface SocialIntegrationStatus {
  type: SocialIntegrationType;
  configured: boolean;
  config: Record<string, string>;
}

export async function listSocialIntegrationStatus(
  workspaceId: string,
  projectId: string,
): Promise<SocialIntegrationStatus[]> {
  await assertProjectInWorkspace(workspaceId, projectId);
  const rows =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({
            type: pgProjectIntegrations.type,
            status: pgProjectIntegrations.status,
            config: pgProjectIntegrations.config,
          })
          .from(pgProjectIntegrations)
          .where(eq(pgProjectIntegrations.projectId, projectId))
      : await databaseAdapter.db
          .select({
            type: projectIntegrations.type,
            status: projectIntegrations.status,
            config: projectIntegrations.config,
          })
          .from(projectIntegrations)
          .where(eq(projectIntegrations.projectId, projectId));
  return socialIntegrationTypes.map((type) => {
    const row = rows.find((item) => item.type === type);
    return {
      type,
      configured: row?.status === "configured",
      config: ((row?.config ?? {}) as Record<string, string>) || {},
    };
  });
}

export interface SocialCredentials {
  config: Record<string, string>;
  secret: string;
}

// Server-only: engine dùng khi chạy module đăng bài.
export async function getSocialCredentials(
  workspaceId: string,
  projectId: string,
  type: SocialIntegrationType,
): Promise<SocialCredentials | null> {
  const key = process.env.VAULT_ENCRYPTION_KEY?.trim();
  if (!key) return null;
  const rows =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({
            status: pgProjectIntegrations.status,
            config: pgProjectIntegrations.config,
            encryptedCredentials: pgProjectIntegrations.encryptedCredentials,
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
              eq(pgProjectIntegrations.type, type),
            ),
          )
          .limit(1)
      : await databaseAdapter.db
          .select({
            status: projectIntegrations.status,
            config: projectIntegrations.config,
            encryptedCredentials: projectIntegrations.encryptedCredentials,
          })
          .from(projectIntegrations)
          .innerJoin(projects, eq(projects.id, projectIntegrations.projectId))
          .where(
            and(
              eq(projects.workspaceId, workspaceId),
              eq(projectIntegrations.projectId, projectId),
              eq(projectIntegrations.type, type),
            ),
          )
          .limit(1);
  const row = rows[0];
  if (!row || row.status !== "configured" || !row.encryptedCredentials) {
    return null;
  }
  return {
    config: ((row.config ?? {}) as Record<string, string>) || {},
    secret: new Vault(key).decrypt(
      row.encryptedCredentials,
      integrationCredentialContext(workspaceId, projectId, type),
    ),
  };
}

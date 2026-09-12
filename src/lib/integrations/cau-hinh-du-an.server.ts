import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { databaseAdapter } from "@/lib/db";
import { pgProjectIntegrations } from "@/lib/db/postgres-schema";
import { projectIntegrations } from "@/lib/db/schema";
import type { LoaiTichHopLuu } from "./integration-service.server";

/**
 * Cấu hình KHÔNG BÍ MẬT của một dự án theo loại — đọc / ghi đè / xoá.
 *
 * Bảng `project_integrations` có khoá (projectId, type). Bản trước mỗi nơi cần
 * lưu một cục JSON (kho GitHub, số điện thoại web khách…) lại chép nguyên
 * đoạn "neon thì thế này, sqlite thì thế kia" — năm bản sao của cùng một
 * upsert. Ở đây là một. Loại có bí mật (token) vẫn đi qua
 * `setSocialIntegration`, nơi bí mật được mã hoá.
 */
export async function docCauHinhDuAn(projectId: string, loai: LoaiTichHopLuu): Promise<Record<string, unknown> | null> {
  const [row] =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({ status: pgProjectIntegrations.status, config: pgProjectIntegrations.config })
          .from(pgProjectIntegrations)
          .where(and(eq(pgProjectIntegrations.projectId, projectId), eq(pgProjectIntegrations.type, loai)))
          .limit(1)
      : await databaseAdapter.db
          .select({ status: projectIntegrations.status, config: projectIntegrations.config })
          .from(projectIntegrations)
          .where(and(eq(projectIntegrations.projectId, projectId), eq(projectIntegrations.type, loai)))
          .limit(1);
  if (!row || row.status !== "configured") return null;
  return (row.config ?? {}) as Record<string, unknown>;
}

export async function ghiCauHinhDuAn(projectId: string, loai: LoaiTichHopLuu, config: Record<string, string>): Promise<void> {
  const now = new Date();
  const values = {
    id: randomUUID(),
    projectId,
    type: loai,
    status: "configured" as const,
    config,
    encryptedCredentials: null,
    createdAt: now,
    updatedAt: now,
  };
  if (databaseAdapter.kind === "neon") {
    await databaseAdapter.db
      .insert(pgProjectIntegrations)
      .values(values)
      .onConflictDoUpdate({
        target: [pgProjectIntegrations.projectId, pgProjectIntegrations.type],
        set: { status: "configured", config, updatedAt: now },
      });
  } else {
    databaseAdapter.db
      .insert(projectIntegrations)
      .values(values)
      .onConflictDoUpdate({
        target: [projectIntegrations.projectId, projectIntegrations.type],
        set: { status: "configured", config, updatedAt: now },
      })
      .run();
  }
}

export async function xoaCauHinhDuAn(projectId: string, loai: LoaiTichHopLuu): Promise<boolean> {
  if (databaseAdapter.kind === "neon") {
    const ra = await databaseAdapter.db
      .delete(pgProjectIntegrations)
      .where(and(eq(pgProjectIntegrations.projectId, projectId), eq(pgProjectIntegrations.type, loai)))
      .returning({ id: pgProjectIntegrations.id });
    return ra.length > 0;
  }
  const ra = databaseAdapter.db
    .delete(projectIntegrations)
    .where(and(eq(projectIntegrations.projectId, projectId), eq(projectIntegrations.type, loai)))
    .returning({ id: projectIntegrations.id })
    .all();
  return ra.length > 0;
}

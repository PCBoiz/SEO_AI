import "server-only";

import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { assertRolePermission } from "@/domain/auth/permissions";
import { getModuleJobRepository } from "@/lib/modules/module-engine.server";
import { getProjectService } from "@/lib/projects/project-service.server";

export const KHOA_MODULE_VIET_HO = "RIS_VIET_HO";

/** Một bản trong lịch sử "AI viết hộ" của một ô. */
export interface BanVietHo {
  jobId: string;
  luc: string;
  provider: string;
  model: string;
  goiY: string;
  /** Nội dung AI đã viết. */
  noiDung: string;
  /** Nội dung ô TRƯỚC khi AI viết lần này — quay về được. */
  banTruoc: string;
}

/**
 * Lịch sử AI viết hộ cho một ô của một dự án — mới nhất trước, tối đa 10.
 *
 * Đọc thẳng bảng job (module ẩn `RIS_VIET_HO`), lọc theo `input.truong`. Không
 * có bảng riêng, không migration: lịch sử này CHÍNH LÀ lịch sử job.
 */
export async function lichSuVietHo(
  identity: AuthenticatedIdentity,
  projectId: string,
  truong: string,
): Promise<BanVietHo[]> {
  assertRolePermission(identity.role, "workspace.read");
  await getProjectService().get(identity, projectId);
  const jobs = await getModuleJobRepository().listRecentForModule(
    identity.workspaceId,
    projectId,
    KHOA_MODULE_VIET_HO,
    120,
  );
  return jobs
    .filter((j) => j.status === "succeeded" && j.input.truong === truong && j.output)
    .slice(0, 10)
    .map((j) => {
      const i = j.input as { giaTriHienTai?: string; goiY?: string; ai?: { provider?: string; model?: string } };
      return {
        jobId: j.id,
        luc: j.createdAt.toISOString(),
        provider: i.ai?.provider ?? "",
        model: i.ai?.model ?? "",
        goiY: i.goiY ?? "",
        noiDung: String(j.output?.noiDung ?? ""),
        banTruoc: i.giaTriHienTai ?? "",
      };
    });
}

import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { docLinkDrive } from "@/domain/google/drive-link";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { databaseAdapter } from "@/lib/db";
import { pgProjectIntegrations } from "@/lib/db/postgres-schema";
import { projectIntegrations } from "@/lib/db/schema";
import { layThuMuc } from "@/lib/google/drive.server";
import { getProjectService } from "@/lib/projects/project-service.server";

/* ══════════════════════════════════════════════════════════════════════════
   THƯ MỤC ẢNH DRIVE CỦA DỰ ÁN

   Lưu trong `project_integrations`, loại `drive_folder`, KHÔNG có bí mật: chỉ
   mã thư mục và `userId` của người nối (token của người đó dùng để đọc). Không
   dùng `setSocialIntegration` vì hàm đó bắt buộc có bí mật — và nhét mã thư
   mục vào ô bí mật là nói dối với người đọc mã sau này.
   ══════════════════════════════════════════════════════════════════════════ */

const LOAI = "drive_folder" as const;

export type CauHinhThuMucAnh = {
  folderId: string;
  ten: string;
  userId: string;
  noiLuc: string;
};

export type KetQuaNoiThuMuc =
  | { trangThai: "ok"; thuMuc: { id: string; ten: string } }
  | { trangThai: "loi"; lyDo: string };

/** Kiểm link → kiểm đọc được bằng token của người nối → lưu. */
export async function noiThuMucAnh(
  identity: AuthenticatedIdentity,
  projectId: string,
  link: string,
): Promise<KetQuaNoiThuMuc> {
  // Kiểm dự án thuộc workspace (ném NotFound nếu không).
  await getProjectService().get(identity, projectId);

  const doc = docLinkDrive(link);
  if (doc.loai === "tep") {
    return {
      trangThai: "loi",
      lyDo: "Đây là link của MỘT tệp, không phải thư mục. Mở thư mục chứa ảnh trên Drive, bấm Chia sẻ → Sao chép đường liên kết, rồi dán vào đây.",
    };
  }
  if (doc.loai === "khong-hop-le") {
    return { trangThai: "loi", lyDo: "Không đọc được link Google Drive này." };
  }

  const tm = await layThuMuc(identity, doc.id);
  if (tm.trangThai !== "ok") {
    return {
      trangThai: "loi",
      lyDo:
        tm.trangThai === "chua-ket-noi"
          ? "Chưa kết nối Google. Vào Cài đặt → Kết nối tự động hoá."
          : tm.trangThai === "thieu-quyen"
            ? `Token Google thiếu quyền: ${tm.quyenConThieu.join(", ")}. Vào Cài đặt → Kết nối tự động hoá để cấp lại.`
            : tm.lyDo,
    };
  }

  const cauHinh: CauHinhThuMucAnh = {
    folderId: tm.duLieu.id,
    ten: tm.duLieu.ten,
    userId: identity.userId,
    noiLuc: new Date().toISOString(),
  };
  await ghi(projectId, { ...cauHinh });
  return { trangThai: "ok", thuMuc: { id: tm.duLieu.id, ten: tm.duLieu.ten } };
}

export async function layThuMucAnh(projectId: string): Promise<CauHinhThuMucAnh | null> {
  const [row] =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({ status: pgProjectIntegrations.status, config: pgProjectIntegrations.config })
          .from(pgProjectIntegrations)
          .where(and(eq(pgProjectIntegrations.projectId, projectId), eq(pgProjectIntegrations.type, LOAI)))
          .limit(1)
      : await databaseAdapter.db
          .select({ status: projectIntegrations.status, config: projectIntegrations.config })
          .from(projectIntegrations)
          .where(and(eq(projectIntegrations.projectId, projectId), eq(projectIntegrations.type, LOAI)))
          .limit(1);
  if (!row || row.status !== "configured") return null;
  const c = (row.config ?? {}) as Partial<CauHinhThuMucAnh>;
  if (!c.folderId || !c.userId) return null;
  return { folderId: c.folderId, ten: c.ten ?? "", userId: c.userId, noiLuc: c.noiLuc ?? "" };
}

async function ghi(projectId: string, config: Record<string, string>): Promise<void> {
  const now = new Date();
  const values = {
    id: randomUUID(),
    projectId,
    type: LOAI,
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

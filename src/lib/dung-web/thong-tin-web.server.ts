import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { databaseAdapter } from "@/lib/db";
import { pgProjectIntegrations } from "@/lib/db/postgres-schema";
import { projectIntegrations } from "@/lib/db/schema";

/* ══════════════════════════════════════════════════════════════════════════
   SỐ ĐIỆN THOẠI + ZALO CỦA WEB KHÁCH — nhớ theo dự án

   Thẻ "Website dựng sẵn" đòi số điện thoại mỗi lần (đúng: máy không được bịa
   số). Nhưng đòi GÕ LẠI mỗi lần mở trang thì sai: chủ dự án đẩy bản mới lên
   GitHub tuần sau lại phải nhớ số của khách đó. Lưu vào `project_integrations`
   loại `dung_web` (không bí mật) ở lần dùng đầu; lần sau thẻ điền sẵn, và tuyến
   trạng thái soát bằng số thật thay vì số giữ chỗ.
   ══════════════════════════════════════════════════════════════════════════ */

const LOAI = "dung_web" as const;

export interface ThongTinWebDaLuu {
  dienThoai: string;
  zalo: string;
  luuLuc: string;
}

export async function docThongTinWeb(projectId: string): Promise<ThongTinWebDaLuu | null> {
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
  const c = (row.config ?? {}) as Partial<ThongTinWebDaLuu>;
  if (!c.dienThoai) return null;
  return { dienThoai: c.dienThoai, zalo: c.zalo ?? "", luuLuc: c.luuLuc ?? "" };
}

export async function ghiThongTinWeb(projectId: string, thongTin: { dienThoai: string; zalo?: string }): Promise<void> {
  const now = new Date();
  const config: Record<string, string> = {
    dienThoai: thongTin.dienThoai.trim(),
    zalo: (thongTin.zalo ?? "").trim(),
    luuLuc: now.toISOString(),
  };
  if (!config.dienThoai) return;
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

import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { ValidationError } from "@/domain/shared/app-error";
import { logger } from "@/infrastructure/observability/logger";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { getVault } from "@/lib/auth/oauth.server";
import { databaseAdapter } from "@/lib/db";
import { pgProjectIntegrations, pgProjects } from "@/lib/db/postgres-schema";
import { projectIntegrations, projects } from "@/lib/db/schema";
import {
  integrationCredentialContext,
  setSocialIntegration,
} from "@/lib/integrations/integration-service.server";
import { getProjectService } from "@/lib/projects/project-service.server";
import { noiDong, taoBang } from "@/lib/google/sheets.server";
import {
  TIEU_DE_COT,
  dongChoBang,
  khachLienHeSchema,
  type KhachLienHe,
} from "@/domain/lead/khach-lien-he";

/* ══════════════════════════════════════════════════════════════════════════
   BẢNG KHÁCH LIÊN HỆ — website → Antigravity → Google Sheets của chủ dự án

   Tình trạng trước 11/09: form trên halongxanh360.vn gửi tới `LEAD_WEBHOOK_URL`
   nếu có; không có thì ghi vào `.data/dang-ky.jsonl` trên VPS. Tệp đó sống qua
   deploy (có volume) — nhưng không ai mở nó. Khách để lại số điện thoại thật,
   và số đó nằm trong một tệp JSONL trên máy chủ.

   Luồng mới:
     1. Chủ dự án bấm "Lập bảng" ở trang dự án → Antigravity tạo một Google
        Sheet bằng token của họ, sinh một token chia sẻ, lưu cả hai vào
        `project_integrations` (loại `lead_sheet`, token mã hoá vault).
     2. Chủ dự án dán `LEAD_WEBHOOK_URL` + `LEAD_WEBHOOK_TOKEN` vào `.env` của
        website.
     3. Mỗi lượt khách → website POST tới đây → một dòng mới trong Sheet.

   ⚠️ CỔNG NHẬN KHÁCH KHÔNG CÓ PHIÊN ĐĂNG NHẬP. Nó tin token chia sẻ, so theo
   thời gian hằng số, rồi dùng token Google của NGƯỜI ĐÃ LẬP BẢNG (userId lưu
   trong config) để ghi. Không có phiên nghĩa là không có `identity` — mọi hàm
   dưới nhận `{workspaceId, userId}` trần.
   ══════════════════════════════════════════════════════════════════════════ */

const LOAI = "lead_sheet" as const;

export { TIEU_DE_COT, khachLienHeSchema, type KhachLienHe };

// `type` thay vì `interface`: cột config là `Record<string, string>`, và một
// type alias đóng mới có index signature ngầm để gán vào đó.
export type CauHinhBangKhach = {
  spreadsheetId: string;
  spreadsheetUrl: string;
  /** Người có token Google dùng để ghi. */
  userId: string;
  lapLuc: string;
};

export interface BangKhachDaLap {
  spreadsheetUrl: string;
  /** Địa chỉ website phải POST tới. */
  webhookUrl: string;
  /** Chỉ trả về ĐÚNG MỘT LẦN — lúc lập. Sau đó chỉ còn bản mã hoá. */
  token: string;
}

/**
 * Lập bảng cho một dự án: tạo Sheet, sinh token, lưu tích hợp.
 *
 * Lập lại thì tạo bảng MỚI và token MỚI — bảng cũ vẫn còn trên Drive, không bị
 * xoá (dữ liệu khách không phải thứ tự động xoá).
 */
export async function lapBangKhach(
  identity: AuthenticatedIdentity,
  projectId: string,
  goc: string,
): Promise<
  | { trangThai: "ok"; duLieu: BangKhachDaLap }
  | { trangThai: "chua-ket-noi" | "thieu-quyen" | "can-ket-noi-lai" | "loi"; lyDo: string }
> {
  const project = await getProjectService().get(identity, projectId);

  const bang = await taoBang(
    identity,
    `Khách liên hệ — ${project.name}`,
    TIEU_DE_COT,
  );
  if (bang.trangThai !== "ok") {
    return {
      trangThai: bang.trangThai,
      lyDo:
        bang.trangThai === "chua-ket-noi"
          ? "Chưa kết nối Google. Vào Cài đặt → Kết nối tự động hoá."
          : bang.trangThai === "thieu-quyen"
            ? `Token Google thiếu quyền: ${bang.quyenConThieu.join(", ")}. Vào Cài đặt → Cấp thêm quyền.`
            : bang.lyDo,
    };
  }

  // 32 byte → 64 ký tự hex. Đủ dài để không đoán được; chỉ chữ và số nên dán
  // vào `.env` không cần nháy.
  const token = randomBytes(32).toString("hex");
  const cauHinh: CauHinhBangKhach = {
    spreadsheetId: bang.duLieu.spreadsheetId,
    spreadsheetUrl: bang.duLieu.url,
    userId: identity.userId,
    lapLuc: new Date().toISOString(),
  };
  await setSocialIntegration(
    identity.workspaceId,
    projectId,
    LOAI,
    { ...cauHinh },
    token,
  );

  return {
    trangThai: "ok",
    duLieu: {
      spreadsheetUrl: bang.duLieu.url,
      webhookUrl: `${goc.replace(/\/+$/, "")}/api/v1/lien-he/${projectId}`,
      token,
    },
  };
}

/** Trạng thái để hiện trên trang dự án — không lộ token. */
export async function trangThaiBangKhach(
  identity: AuthenticatedIdentity,
  projectId: string,
): Promise<{ daLap: false } | { daLap: true; spreadsheetUrl: string; lapLuc: string; webhookUrl: string }> {
  const row = await timBanGhi(projectId);
  if (!row || row.workspaceId !== identity.workspaceId || row.status !== "configured") {
    return { daLap: false };
  }
  const c = row.config as Partial<CauHinhBangKhach>;
  if (!c.spreadsheetUrl) return { daLap: false };
  return {
    daLap: true,
    spreadsheetUrl: c.spreadsheetUrl,
    lapLuc: c.lapLuc ?? "",
    webhookUrl: `/api/v1/lien-he/${projectId}`,
  };
}

export type KetQuaNhanKhach =
  | { trangThai: "ok"; updatedRange: string }
  | { trangThai: "sai-token" }
  | { trangThai: "chua-lap" }
  | { trangThai: "khong-ghi-duoc"; lyDo: string };

/**
 * Cổng nhận: kiểm token rồi nối một dòng vào bảng.
 *
 * ⚠️ So token theo THỜI GIAN HẰNG SỐ — cùng lý do `duyet-bai.ts` bên kho site
 * đã ghi: so bằng `===` để lộ độ dài phần khớp qua thời gian chạy.
 */
export async function nhanKhach(
  projectId: string,
  tokenNhan: string,
  khach: KhachLienHe,
): Promise<KetQuaNhanKhach> {
  const row = await timBanGhi(projectId);
  if (!row || row.status !== "configured" || !row.encryptedCredentials) {
    return { trangThai: "chua-lap" };
  }

  let tokenThat: string;
  try {
    tokenThat = getVault().decrypt(
      row.encryptedCredentials,
      integrationCredentialContext(row.workspaceId, projectId, LOAI),
    );
  } catch {
    logger.warn({ projectId }, "lead_sheet token could not be decrypted");
    return { trangThai: "chua-lap" };
  }
  if (!tokenKhop(tokenNhan, tokenThat)) return { trangThai: "sai-token" };

  const c = row.config as Partial<CauHinhBangKhach>;
  if (!c.spreadsheetId || !c.userId) return { trangThai: "chua-lap" };

  const kq = await noiDong(
    { workspaceId: row.workspaceId, userId: c.userId },
    c.spreadsheetId,
    dongChoBang(khach),
  );
  if (kq.trangThai !== "ok") {
    // KHÔNG ghi thông tin khách vào log — số điện thoại thật của người thật.
    logger.warn({ projectId, trangThai: kq.trangThai }, "lead_sheet append failed");
    return {
      trangThai: "khong-ghi-duoc",
      lyDo:
        kq.trangThai === "loi"
          ? kq.lyDo
          : kq.trangThai === "can-ket-noi-lai"
            ? kq.lyDo
            : "Token Google của người lập bảng không còn dùng được — vào Antigravity kết nối lại.",
    };
  }
  return { trangThai: "ok", updatedRange: kq.duLieu.updatedRange };
}

/* -------------------------------------------------------------------------- */

async function timBanGhi(projectId: string): Promise<{
  workspaceId: string;
  status: string;
  config: unknown;
  encryptedCredentials: string | null;
} | null> {
  const [row] =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({
            workspaceId: pgProjects.workspaceId,
            status: pgProjectIntegrations.status,
            config: pgProjectIntegrations.config,
            encryptedCredentials: pgProjectIntegrations.encryptedCredentials,
          })
          .from(pgProjectIntegrations)
          .innerJoin(pgProjects, eq(pgProjects.id, pgProjectIntegrations.projectId))
          .where(
            and(
              eq(pgProjectIntegrations.projectId, projectId),
              eq(pgProjectIntegrations.type, LOAI),
            ),
          )
          .limit(1)
      : await databaseAdapter.db
          .select({
            workspaceId: projects.workspaceId,
            status: projectIntegrations.status,
            config: projectIntegrations.config,
            encryptedCredentials: projectIntegrations.encryptedCredentials,
          })
          .from(projectIntegrations)
          .innerJoin(projects, eq(projects.id, projectIntegrations.projectId))
          .where(
            and(
              eq(projectIntegrations.projectId, projectId),
              eq(projectIntegrations.type, LOAI),
            ),
          )
          .limit(1);
  return row ?? null;
}

function tokenKhop(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

export function docThanKhach(body: unknown): KhachLienHe {
  const r = khachLienHeSchema.safeParse(body);
  if (!r.success) {
    throw new ValidationError("LIEN_HE_INVALID", "Thông tin khách không hợp lệ.", {
      issues: r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  return r.data;
}

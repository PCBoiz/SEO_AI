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
): Promise<
  | { daLap: false }
  | {
      daLap: true;
      spreadsheetUrl: string;
      lapLuc: string;
      webhookUrl: string;
      lanNhanCuoi: string | null;
      ketQuaCuoi: string | null;
    }
> {
  const row = await timBanGhi(projectId);
  if (!row || row.workspaceId !== identity.workspaceId || row.status !== "configured") {
    return { daLap: false };
  }
  const c = row.config as Partial<CauHinhBangKhach> & Partial<DauVetNhan>;
  if (!c.spreadsheetUrl) return { daLap: false };
  return {
    daLap: true,
    spreadsheetUrl: c.spreadsheetUrl,
    lapLuc: c.lapLuc ?? "",
    // Chỉ phần đường dẫn — giao diện ghép gốc bằng `window.location.origin`.
    // ⚠️ Giao diện KHÔNG được hiện riêng phần này cho người dùng chép: dán một
    // địa chỉ tương đối vào `.env` là website không gọi được mà vẫn báo khách
    // "Đã nhận" (vì rơi về tệp). Đúng cái bẫy đã có ở bản đầu của thẻ.
    webhookUrl: `/api/v1/lien-he/${projectId}`,
    lanNhanCuoi: c.lanNhanCuoi ?? null,
    ketQuaCuoi: c.ketQuaCuoi ?? null,
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
  const c = row.config as Partial<CauHinhBangKhach> & Partial<DauVetNhan>;

  // ⚠️ THIẾU TOKEN CŨNG PHẢI ĐỂ LẠI DẤU VẾT (sửa 12/09). Trước đây route trả
  // 401 ngay khi thiếu header, không vào tới đây — thẻ trên trang dự án hiện
  // "Chưa nhận lượt nào từ website" trong khi website CÓ gọi, chỉ là không kèm
  // token (compose bên kho site quên chuyển LEAD_WEBHOOK_TOKEN vào hộp chứa).
  // Câu sai dẫn chủ dự án đi kiểm sai chỗ.
  if (!tokenNhan) {
    await ghiDauVetGioiHan(projectId, c, "thieu-token");
    return { trangThai: "sai-token" };
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
  if (!tokenKhop(tokenNhan, tokenThat)) {
    // Ghi dấu "có gửi tới nhưng sai token" — nguyên nhân hay gặp khi dán
    // `.env` (chép thiếu, dính dấu cách).
    await ghiDauVetGioiHan(projectId, c, "sai-token");
    return { trangThai: "sai-token" };
  }

  if (!c.spreadsheetId || !c.userId) return { trangThai: "chua-lap" };

  const kq = await noiDong(
    { workspaceId: row.workspaceId, userId: c.userId },
    c.spreadsheetId,
    dongChoBang(khach),
  );
  if (kq.trangThai !== "ok") {
    // KHÔNG ghi thông tin khách vào log — số điện thoại thật của người thật.
    logger.warn({ projectId, trangThai: kq.trangThai }, "lead_sheet append failed");
    const lyDo =
      kq.trangThai === "loi" || kq.trangThai === "can-ket-noi-lai"
        ? kq.lyDo
        : "Token Google của người lập bảng không còn dùng được — vào Antigravity kết nối lại.";
    await ghiDauVet(projectId, c, { ketQuaCuoi: `loi: ${lyDo}` });
    return { trangThai: "khong-ghi-duoc", lyDo };
  }
  await ghiDauVet(projectId, c, { ketQuaCuoi: "ok" });
  return { trangThai: "ok", updatedRange: kq.duLieu.updatedRange };
}

/* ══════════════════════════════════════════════════════════════════════════
   DẤU VẾT LƯỢT NHẬN — để chủ dự án tự thấy chuyện gì đang xảy ra

   ⚠️ SINH RA TỪ MỘT LẦN THỬ THẬT (khuya 11/09): chủ dự án điền form trên
   website, thấy "Cảm ơn bạn — Đã nhận", mở bảng thì trống. Màn cảm ơn hiện y
   hệt nhau dù khách vào bảng hay rơi về tệp trên VPS, nên KHÔNG CÓ CÁCH NÀO
   biết khách đi đâu — và bốn nguyên nhân (chưa sửa `.env`, dán sai địa chỉ,
   dán sai token, Google từ chối) cần bốn cách chữa khác nhau.

   Giờ mỗi lượt website gọi tới đều để lại một dòng: lúc nào, kết quả gì. Thẻ
   trên trang dự án đọc ra. "Chưa nhận lượt nào" nghĩa là website chưa từng gọi
   tới — lỗi nằm ở phía VPS, không phải ở đây.
   ══════════════════════════════════════════════════════════════════════════ */

type DauVetNhan = {
  lanNhanCuoi: string;
  /** "ok" | "sai-token" | "thieu-token" | "loi: <lý do>" */
  ketQuaCuoi: string;
};

/**
 * Dấu vết cho lượt BỊ TỪ CHỐI. Cổng này ai cũng gọi được, nên tối đa một lần
 * ghi mỗi phút: không để người lạ biến nó thành cửa ghi cơ sở dữ liệu liên tục.
 */
async function ghiDauVetGioiHan(
  projectId: string,
  configCu: Partial<DauVetNhan> & Record<string, unknown>,
  ketQuaCuoi: "sai-token" | "thieu-token",
): Promise<void> {
  const truoc = configCu.lanNhanCuoi ? Date.parse(configCu.lanNhanCuoi) : 0;
  if (!Number.isFinite(truoc) || Date.now() - truoc > 60_000) {
    await ghiDauVet(projectId, configCu, { ketQuaCuoi });
  }
}

async function ghiDauVet(
  projectId: string,
  configCu: Record<string, unknown>,
  dauVet: Omit<DauVetNhan, "lanNhanCuoi">,
): Promise<void> {
  const config = {
    ...(configCu as Record<string, string>),
    lanNhanCuoi: new Date().toISOString(),
    ketQuaCuoi: dauVet.ketQuaCuoi.slice(0, 300),
  };
  try {
    if (databaseAdapter.kind === "neon") {
      await databaseAdapter.db
        .update(pgProjectIntegrations)
        .set({ config })
        .where(and(eq(pgProjectIntegrations.projectId, projectId), eq(pgProjectIntegrations.type, LOAI)));
    } else {
      databaseAdapter.db
        .update(projectIntegrations)
        .set({ config })
        .where(and(eq(projectIntegrations.projectId, projectId), eq(projectIntegrations.type, LOAI)))
        .run();
    }
  } catch (error) {
    // Dấu vết là phụ — hỏng ghi dấu vết KHÔNG được làm hỏng lượt nhận khách.
    logger.warn({ projectId, err: error instanceof Error ? error.message : String(error) }, "lead_sheet trace write failed");
  }
}

/**
 * Ghi MỘT dòng thử vào bảng, bằng đúng cấu hình đang lưu — bỏ qua website.
 *
 * Tách được hai nửa đường đi: dòng thử vào bảng mà khách thật không vào → lỗi
 * nằm ở website/VPS. Dòng thử cũng không vào → lỗi ở Antigravity/Google, và
 * câu báo lỗi nói luôn là gì (API chưa bật, token hết hạn…).
 */
export async function guiThuMotDong(
  identity: AuthenticatedIdentity,
  projectId: string,
): Promise<{ trangThai: "ok" } | { trangThai: "loi"; lyDo: string }> {
  const row = await timBanGhi(projectId);
  if (!row || row.workspaceId !== identity.workspaceId || row.status !== "configured") {
    return { trangThai: "loi", lyDo: "Dự án này chưa lập bảng khách." };
  }
  const c = row.config as Partial<CauHinhBangKhach>;
  if (!c.spreadsheetId || !c.userId) return { trangThai: "loi", lyDo: "Cấu hình bảng không đủ — lập bảng mới." };

  const kq = await noiDong(
    { workspaceId: row.workspaceId, userId: c.userId },
    c.spreadsheetId,
    dongChoBang({
      dienThoai: "(thử)",
      uuTien: "Dòng thử từ Antigravity — xoá được",
      hoTen: "",
      quanTam: "",
      ghiChu: "",
      thoiDiem: "",
      nguon: "antigravity · gửi thử",
    }),
  );
  if (kq.trangThai === "ok") return { trangThai: "ok" };
  return {
    trangThai: "loi",
    lyDo:
      kq.trangThai === "loi" || kq.trangThai === "can-ket-noi-lai"
        ? kq.lyDo
        : kq.trangThai === "thieu-quyen"
          ? `Token Google thiếu quyền: ${kq.quyenConThieu.join(", ")}.`
          : "Người lập bảng chưa kết nối Google.",
  };
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

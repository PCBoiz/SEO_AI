import "server-only";

import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  BUOC_LICH_DANG,
  LUOT_HET_HAN_SAU_NGAY,
  SO_LUOT_GIU,
  cauHinhLichSchema,
  chonChuDe,
  chuDeDaDung,
  chuanHoaChuDe,
  congNgay,
  dungDauVao,
  luotDangDo,
  nenBatDauLuotMoi,
  ngayVN,
  poolCuaLuot,
  tinhTienDo,
  type BuocTienDo,
  type CauHinhLich,
  type LuotLich,
} from "@/domain/lich-dang/lich-dang";
import { khoaBuocLich } from "@/domain/lich-dang/khoa-buoc";
import { docViPham, laTuChoiNoiDung } from "@/domain/lich-dang/luat-viet";
import type { WorkspaceRole } from "@/domain/auth/permissions";
import {
  getModuleDefinition,
  toModuleDefinitionView,
} from "@/domain/modules/module-definition";
import "@/domain/modules/registry";
import { NotFoundError, ValidationError } from "@/domain/shared/app-error";
import { logger } from "@/infrastructure/observability/logger";
import { getAiKeyService } from "@/lib/ai/ai-key-service.server";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { getVault } from "@/lib/auth/oauth.server";
import { databaseAdapter } from "@/lib/db";
import {
  pgProjectIntegrations,
  pgProjects,
  pgWorkspaceMembers,
} from "@/lib/db/postgres-schema";
import { projectIntegrations, projects, workspaceMembers } from "@/lib/db/schema";
import { getSocialCredentials, integrationCredentialContext } from "@/lib/integrations/integration-service.server";
import { layCauHinhTrang } from "@/infrastructure/config/vinhomes-site-environment";
import { getModuleJobRepository, runModuleJobAppNative } from "@/lib/modules/module-engine.server";
import { nenGoTuTrang, type LyDoGoTuTrang } from "@/domain/lich-dang/luoi-an-toan";
import { getModuleJobService } from "@/lib/modules/module-service.server";
import { getProjectService } from "@/lib/projects/project-service.server";
import { layTruyVanChoLich } from "@/lib/seo/search-console.server";

/* ══════════════════════════════════════════════════════════════════════════
   LỊCH ĐĂNG BÀI TỰ ĐỘNG — phần chạm cơ sở dữ liệu, job, mạng

   Lưu ở `project_integrations` loại `lich_dang`:
     · config   — cấu hình chủ dự án điền + sổ lượt + dấu vết lần gõ gần nhất
     · secret   — mã kích hoạt (VPS gõ nhịp bằng mã này), mã hoá trong vault

   Ai gõ nhịp: crontab trên VPS, mỗi 10 phút, POST tới `/api/v1/lich-dang/
   [projectId]/tick` với `Authorization: Bearer <mã>`. Không có phiên đăng
   nhập — như cổng nhận khách. Mỗi lần gõ đi ĐÚNG MỘT bước, rồi khi bước đó
   chạy xong thì tự gõ tiếp một lần (lời gọi HTTP tới chính mình, để có một
   lượt 300 giây mới). Nhịp 10 phút của VPS là lưới an toàn cho lượt bị đứt.

   ⚠️ TOKEN GOOGLE VÀ KHOÁ AI LÀ CỦA NGƯỜI BẬT LỊCH (`config.userId`): mỗi
   bước chạy bằng khoá AI của người đó, chủ đề dự phòng đọc Search Console bằng
   token Google của người đó. Người đó rời workspace là lịch tự dừng.
   ══════════════════════════════════════════════════════════════════════════ */

const LOAI = "lich_dang" as const;

export type NguonGo = "vps" | "tu-go" | "tay";

type CauHinhLuu = {
  cauHinh: CauHinhLich;
  userId: string;
  luot: LuotLich[];
  lanGoCuoi?: string;
  ketQuaGoCuoi?: string;
  nguonGoCuoi?: NguonGo;
  /** Lần gần nhất VPS (crontab) gõ — để biết lưới an toàn có đang chạy không. */
  lanGoVpsCuoi?: string;
  /** Ngày (VN) gần nhất đã gõ website báo Bing các bài hẹn ngày tới hạn. */
  ngayBaoToiNgay?: string;
  ketQuaBaoToiNgay?: string;
};

/**
 * Một bước được chạy tối đa chừng này trong một lượt gọi. Trần Vercel là 300
 * giây; một bước có thể mất 2 × 120 giây gọi AI. Quá rào thì đánh dấu hết
 * giờ và GÕ TIẾP NGAY để lượt không chết theo hàm — lỗi thật 12/09: bước 5
 * kẹt "đang chạy" 23 phút, không nhịp gõ nào sau đó vì crontab chưa dán.
 */
function raoBuocMs(): number {
  // Đọc lúc gọi (không phải lúc nạp module) để test đặt được rào ngắn.
  const tuEnv = Number(process.env.LICH_DANG_RAO_MS);
  return tuEnv > 0 ? tuEnv : 250_000;
}

export interface TrangThaiLich {
  daLap: boolean;
  cauHinh: CauHinhLich | null;
  coMa: boolean;
  luot: LuotLich[];
  lanGoCuoi: string | null;
  ketQuaGoCuoi: string | null;
  nguonGoCuoi: NguonGo | null;
  lanGoVpsCuoi: string | null;
  /** Lần gần nhất gõ website báo Bing bài hẹn ngày tới hạn. */
  baoToiNgay: { ngay: string; ketQua: string } | null;
  /** Tiến độ lượt đang dở, đọc từ bảng job. */
  dangDo: { luot: LuotLich; cacBuoc: BuocTienDo[] } | null;
  tickPath: string;
  /**
   * Trang nên tự gõ một nhịp hộ hay không (chỉ khi CHƯA có crontab) — xem
   * `domain/lich-dang/luoi-an-toan.ts`. `null` = không cần.
   */
  goTuTrang: LyDoGoTuTrang | null;
}

/* ─────────────────────────── Đọc / ghi ────────────────────────────────── */

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
          .where(and(eq(pgProjectIntegrations.projectId, projectId), eq(pgProjectIntegrations.type, LOAI)))
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
          .where(and(eq(projectIntegrations.projectId, projectId), eq(projectIntegrations.type, LOAI)))
          .limit(1);
  return row ?? null;
}

function docCauHinh(config: unknown): CauHinhLuu | null {
  const c = (config ?? {}) as Partial<CauHinhLuu>;
  const cauHinh = cauHinhLichSchema.safeParse(c.cauHinh);
  if (!cauHinh.success || !c.userId) return null;
  return {
    cauHinh: cauHinh.data,
    userId: c.userId,
    luot: Array.isArray(c.luot) ? c.luot : [],
    lanGoCuoi: c.lanGoCuoi,
    ketQuaGoCuoi: c.ketQuaGoCuoi,
    nguonGoCuoi: c.nguonGoCuoi,
    lanGoVpsCuoi: c.lanGoVpsCuoi,
    ngayBaoToiNgay: c.ngayBaoToiNgay,
    ketQuaBaoToiNgay: c.ketQuaBaoToiNgay,
  };
}

async function ghi(
  projectId: string,
  config: CauHinhLuu,
  encryptedCredentials: string | null | undefined,
): Promise<void> {
  const now = new Date();
  const luu = { ...config, luot: config.luot.slice(-SO_LUOT_GIU) };
  const values = {
    id: randomUUID(),
    projectId,
    type: LOAI,
    status: "configured" as const,
    config: luu,
    encryptedCredentials: encryptedCredentials ?? null,
    createdAt: now,
    updatedAt: now,
  };
  // `undefined` = giữ nguyên mã đang có; `null` = xoá mã.
  const setMa = encryptedCredentials === undefined ? {} : { encryptedCredentials };
  if (databaseAdapter.kind === "neon") {
    await databaseAdapter.db
      .insert(pgProjectIntegrations)
      .values(values)
      .onConflictDoUpdate({
        target: [pgProjectIntegrations.projectId, pgProjectIntegrations.type],
        set: { status: "configured", config: luu, updatedAt: now, ...setMa },
      });
  } else {
    databaseAdapter.db
      .insert(projectIntegrations)
      .values(values)
      .onConflictDoUpdate({
        target: [projectIntegrations.projectId, projectIntegrations.type],
        set: { status: "configured", config: luu, updatedAt: now, ...setMa },
      })
      .run();
  }
}

async function vaiTro(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
  const [row] =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({ role: pgWorkspaceMembers.role })
          .from(pgWorkspaceMembers)
          .where(and(eq(pgWorkspaceMembers.workspaceId, workspaceId), eq(pgWorkspaceMembers.userId, userId)))
          .limit(1)
      : await databaseAdapter.db
          .select({ role: workspaceMembers.role })
          .from(workspaceMembers)
          .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
          .limit(1);
  return row?.role ?? null;
}

/* ─────────────────────────── Cho trang dự án ──────────────────────────── */

export async function trangThaiLich(
  identity: AuthenticatedIdentity,
  projectId: string,
): Promise<TrangThaiLich> {
  const tickPath = `/api/v1/lich-dang/${projectId}/tick`;
  const row = await timBanGhi(projectId);
  if (!row || row.workspaceId !== identity.workspaceId || row.status !== "configured") {
    return { daLap: false, cauHinh: null, coMa: false, luot: [], lanGoCuoi: null, ketQuaGoCuoi: null, nguonGoCuoi: null, lanGoVpsCuoi: null, baoToiNgay: null, dangDo: null, tickPath, goTuTrang: null };
  }
  const c = docCauHinh(row.config);
  if (!c) {
    return { daLap: false, cauHinh: null, coMa: false, luot: [], lanGoCuoi: null, ketQuaGoCuoi: null, nguonGoCuoi: null, lanGoVpsCuoi: null, baoToiNgay: null, dangDo: null, tickPath, goTuTrang: null };
  }
  const dangDo = luotDangDo(c.luot);
  let tienDo: TrangThaiLich["dangDo"] = null;
  if (dangDo) {
    const jobs = await getModuleJobRepository().listByIdempotencyKeys(
      row.workspaceId,
      projectId,
      khoaCuaLuot(projectId, dangDo),
    );
    tienDo = {
      luot: dangDo,
      cacBuoc: tinhTienDo(BUOC_LICH_DANG, (b, lan) => khoaBuocLich(projectId, dangDo.ngay, dangDo.lan, b, lan), jobs, new Date()).cacBuoc,
    };
  }
  return {
    daLap: true,
    cauHinh: c.cauHinh,
    coMa: Boolean(row.encryptedCredentials),
    luot: [...c.luot].reverse().slice(0, 14),
    lanGoCuoi: c.lanGoCuoi ?? null,
    ketQuaGoCuoi: c.ketQuaGoCuoi ?? null,
    nguonGoCuoi: c.nguonGoCuoi ?? null,
    lanGoVpsCuoi: c.lanGoVpsCuoi ?? null,
    baoToiNgay: c.ngayBaoToiNgay ? { ngay: c.ngayBaoToiNgay, ketQua: c.ketQuaBaoToiNgay ?? "" } : null,
    dangDo: tienDo,
    tickPath,
    // Lưới an toàn cho người CHƯA dán crontab: xem `luoi-an-toan.ts`. Chỉ nêu
    // ra ở đây; quyết định gõ hay không là của giao diện (nó biết mình vừa gõ
    // trong lần mở trang này chưa).
    goTuTrang: nenGoTuTrang(
      { cauHinh: c.cauHinh, luot: c.luot, lanGoCuoi: c.lanGoCuoi ?? null, lanGoVpsCuoi: c.lanGoVpsCuoi ?? null },
      new Date(),
    ),
  };
}

/**
 * Lưu cấu hình. Người lưu trở thành người "sở hữu" lịch: khoá AI và token
 * Google của họ được dùng khi chạy. Kiểm ngay lúc lưu rằng họ có khoá AI cho
 * nhà cung cấp đã chọn — để lỗi hiện ở đây, không phải 6 giờ sáng mai trong sổ lượt.
 */
export async function luuCauHinhLich(
  identity: AuthenticatedIdentity,
  projectId: string,
  than: unknown,
): Promise<{ trangThai: "ok"; maMoi: string | null } | { trangThai: "loi"; lyDo: string }> {
  await getProjectService().get(identity, projectId);
  const doc = cauHinhLichSchema.safeParse(than);
  if (!doc.success) {
    return { trangThai: "loi", lyDo: doc.error.issues[0]?.message ?? "Cấu hình không hợp lệ." };
  }
  const cauHinh = doc.data;
  if (cauHinh.bat) {
    const khoa = await getAiKeyService().getUsableKey(identity.userId, cauHinh.ai.provider);
    if (!khoa) {
      return {
        trangThai: "loi",
        lyDo: `Bạn chưa có API key ${cauHinh.ai.provider} — vào trang "API Keys" thêm và verify trước. Lịch chạy bằng khoá của người bật lịch.`,
      };
    }
    if (cauHinh.chuDe.length === 0 && !cauHinh.dungSearchConsole) {
      return { trangThai: "loi", lyDo: "Chưa có chủ đề nào, và cũng không lấy từ Search Console — lịch sẽ không có gì để viết." };
    }
  }

  const row = await timBanGhi(projectId);
  const cu = row ? docCauHinh(row.config) : null;
  const config: CauHinhLuu = {
    cauHinh,
    userId: identity.userId,
    luot: cu?.luot ?? [],
    lanGoCuoi: cu?.lanGoCuoi,
    ketQuaGoCuoi: cu?.ketQuaGoCuoi,
    nguonGoCuoi: cu?.nguonGoCuoi,
    lanGoVpsCuoi: cu?.lanGoVpsCuoi,
    ngayBaoToiNgay: cu?.ngayBaoToiNgay,
    ketQuaBaoToiNgay: cu?.ketQuaBaoToiNgay,
  };
  // Lần lưu đầu chưa có mã kích hoạt: sinh luôn, trả về đúng một lần.
  let maMoi: string | null = null;
  let encrypted: string | undefined;
  if (!row?.encryptedCredentials) {
    maMoi = randomBytes(32).toString("hex");
    encrypted = getVault().encrypt(maMoi, integrationCredentialContext(identity.workspaceId, projectId, LOAI));
  }
  await ghi(projectId, config, encrypted);
  return { trangThai: "ok", maMoi };
}

/** Sinh mã kích hoạt mới — mã cũ hết hiệu lực ngay. Trả về đúng một lần. */
export async function taoMaMoi(identity: AuthenticatedIdentity, projectId: string): Promise<string> {
  const row = await timBanGhi(projectId);
  const c = row && row.workspaceId === identity.workspaceId ? docCauHinh(row.config) : null;
  if (!c) throw new NotFoundError("LICH_DANG_NOT_FOUND", "Chưa lưu lịch cho dự án này.", { projectId });
  const ma = randomBytes(32).toString("hex");
  await ghi(projectId, c, getVault().encrypt(ma, integrationCredentialContext(identity.workspaceId, projectId, LOAI)));
  return ma;
}

/* ─────────────────────────── Gõ nhịp ──────────────────────────────────── */

export type KetQuaGo =
  | { trangThai: "sai-ma" }
  | { trangThai: "chua-lap" }
  | { trangThai: "tat" }
  | { trangThai: "chua-toi-gio"; gioChay: number }
  | { trangThai: "het-chu-de" }
  | { trangThai: "dang-cho"; buoc: number; jobId: string }
  | { trangThai: "da-tao"; buoc: number; lan: 0 | 1; jobId: string; vietLai?: boolean; chay: () => Promise<void> }
  | { trangThai: "xong"; postUrl: string | null }
  | { trangThai: "dung"; buoc: number; loi: string }
  | { trangThai: "loi"; lyDo: string };

function maKhop(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

function khoaCuaLuot(projectId: string, luot: Pick<LuotLich, "ngay" | "lan">): string[] {
  const ra: string[] = [];
  for (let b = 0; b < BUOC_LICH_DANG.length; b += 1) {
    ra.push(khoaBuocLich(projectId, luot.ngay, luot.lan, b, 0), khoaBuocLich(projectId, luot.ngay, luot.lan, b, 1));
  }
  return ra;
}

/**
 * Một lần gõ. `epMoLuot` = "Chạy thử ngay" từ trang dự án: bỏ qua giờ và
 * quy tắc một-lượt-một-ngày (mở lượt với `lan` kế tiếp của hôm nay).
 *
 * Trả `chay` khi vừa tạo job: route gọi nó trong `after()` để chạy bước rồi tự
 * gõ tiếp. Hàm này KHÔNG tự chạy job — nó phải trả lời HTTP trước.
 */
export async function goNhip(
  projectId: string,
  ma: string | null,
  lua: { epMoLuot?: boolean; identity?: AuthenticatedIdentity; goc?: string; nguon?: NguonGo } = {},
  bayGio: Date = new Date(),
): Promise<KetQuaGo> {
  const row = await timBanGhi(projectId);
  if (!row || row.status !== "configured") return { trangThai: "chua-lap" };

  // Xác thực: hoặc mã kích hoạt đúng (VPS / tự gõ tiếp), hoặc phiên đăng nhập
  // cùng workspace (nút trên trang dự án).
  if (lua.identity) {
    if (lua.identity.workspaceId !== row.workspaceId) return { trangThai: "chua-lap" };
  } else {
    if (!ma || !row.encryptedCredentials) return { trangThai: "sai-ma" };
    let maThat: string;
    try {
      maThat = getVault().decrypt(row.encryptedCredentials, integrationCredentialContext(row.workspaceId, projectId, LOAI));
    } catch {
      return { trangThai: "sai-ma" };
    }
    if (!maKhop(ma, maThat)) return { trangThai: "sai-ma" };
  }

  const c = docCauHinh(row.config);
  if (!c) return { trangThai: "chua-lap" };
  const { workspaceId } = row;

  const ketQua = await goThat(workspaceId, projectId, c, lua, bayGio);
  // Dấu vết lần gõ — kể cả khi không làm gì, để chủ dự án thấy VPS có gõ.
  // Ghi riêng lần VPS gõ: lượt tự gõ tiếp và nút trên trang cũng là "gõ",
  // nhưng chỉ VPS mới là lưới an toàn — thiếu nó thì một hàm chết là lượt chết.
  const nguon: NguonGo = lua.nguon ?? (lua.identity ? "tay" : "vps");
  c.lanGoCuoi = bayGio.toISOString();
  c.ketQuaGoCuoi = moTaKetQua(ketQua);
  c.nguonGoCuoi = nguon;
  if (nguon === "vps") c.lanGoVpsCuoi = bayGio.toISOString();

  // Việc phụ hằng ngày: gõ website để nó báo Bing các bài HẸN NGÀY TAY vừa tới
  // hạn (`/api/bao-bai-toi-ngay`, idempotent theo ngày ở phía website). Nhịp gõ
  // đã có sẵn ở đây — không bắt chủ dự án dán thêm dòng crontab nào. Chỉ một
  // lần mỗi ngày, chỉ khi lịch đang bật, và không bao giờ làm hỏng nhịp chính.
  if (c.cauHinh.bat && c.ngayBaoToiNgay !== ngayVN(bayGio)) {
    c.ngayBaoToiNgay = ngayVN(bayGio);
    c.ketQuaBaoToiNgay = await goWebsiteBaoToiNgay(workspaceId, projectId);
  }
  await ghi(projectId, c, undefined);
  return ketQua;
}

/** Gọi `/api/bao-bai-toi-ngay` của website dự án bằng khoá đăng bài. Trả câu ngắn để ghi dấu vết. */
async function goWebsiteBaoToiNgay(workspaceId: string, projectId: string): Promise<string> {
  try {
    const tichHop = await getSocialCredentials(workspaceId, projectId, "custom_site");
    const cauHinh = layCauHinhTrang(tichHop ?? undefined);
    const r = await fetch(`${cauHinh.siteUrl}/api/bao-bai-toi-ngay`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cauHinh.token}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) return `website trả HTTP ${r.status}`;
    const d = (await r.json().catch(() => ({}))) as { daBao?: string[]; boQua?: string[]; lyDo?: string };
    const n = d.daBao?.length ?? 0;
    return n > 0 ? `báo Bing ${n} bài tới ngày` : d.lyDo ? `không báo — ${d.lyDo}` : "không có bài hẹn ngày tới hạn";
  } catch (error) {
    // Website bản cũ chưa có tuyến này, hoặc chưa cấu hình trang — không phải
    // việc của lịch đăng; ghi lại rồi thôi.
    return `không gọi được website: ${error instanceof Error ? error.message : "lỗi"}`;
  }
}

function moTaKetQua(k: KetQuaGo): string {
  switch (k.trangThai) {
    case "da-tao":
      return `tạo bước ${k.buoc + 1}/${BUOC_LICH_DANG.length}${k.lan ? " (thử lại)" : ""}${k.vietLai ? " · lượt viết lại sau khi website từ chối" : ""}`;
    case "dang-cho":
      return `đang chờ bước ${k.buoc + 1}/${BUOC_LICH_DANG.length}`;
    case "dung":
      return k.buoc < 0 ? `hôm nay đã dừng: ${k.loi}` : `dừng ở bước ${k.buoc + 1}: ${k.loi}`;
    case "chua-toi-gio":
      return `chưa tới giờ (${k.gioChay}:00)`;
    case "loi":
      return `lỗi: ${k.lyDo}`;
    default:
      return k.trangThai;
  }
}

async function goThat(
  workspaceId: string,
  projectId: string,
  c: CauHinhLuu,
  lua: { epMoLuot?: boolean; identity?: AuthenticatedIdentity; goc?: string },
  bayGio: Date,
): Promise<KetQuaGo> {
  const homNay = ngayVN(bayGio);
  const repository = getModuleJobRepository();

  // 1. Lượt đang dở quá hạn thì chốt "hết hạn" — bài của hôm kia không còn là tin.
  const dangDo = luotDangDo(c.luot);
  if (dangDo && dangDo.ngay < congNgay(homNay, -LUOT_HET_HAN_SAU_NGAY)) {
    dangDo.ketQua = "het-han";
    dangDo.xongLuc = bayGio.toISOString();
    dangDo.loi = `Lượt ${dangDo.ngay} dở quá ${LUOT_HET_HAN_SAU_NGAY} ngày.`;
  }

  // 2. Không có lượt dở → có mở lượt mới không?
  let luot = luotDangDo(c.luot);
  if (!luot) {
    if (!c.cauHinh.bat && !lua.epMoLuot) return { trangThai: "tat" };
    const tuDong = nenBatDauLuotMoi(c.cauHinh, c.luot, bayGio);
    if (!tuDong && !lua.epMoLuot) {
      // Hôm nay đã có lượt (mới nhất theo `lan`): kể lại kết quả của nó.
      const cuaHomNay = [...c.luot].filter((l) => l.ngay === homNay).sort((a, b) => b.lan - a.lan)[0];
      if (!cuaHomNay) return { trangThai: "chua-toi-gio", gioChay: c.cauHinh.gioChay };
      return cuaHomNay.ketQua === "da-dang"
        ? { trangThai: "xong", postUrl: cuaHomNay.postUrl ?? null }
        : { trangThai: "dung", buoc: -1, loi: cuaHomNay.loi ?? "Lượt hôm nay không hoàn thành." };
    }
    const duAn = await layDuAn(workspaceId, projectId);
    if (!duAn) return { trangThai: "loi", lyDo: "Không tìm thấy dự án." };
    const daDung = chuDeDaDung(c.luot);
    const conDanhSach = c.cauHinh.chuDe.some((x) => !daDung.includes(chuanHoaChuDe(x)));
    const gsc =
      !conDanhSach && c.cauHinh.dungSearchConsole
        ? await layTruyVanChoLich({ workspaceId, userId: c.userId }, duAn.website, bayGio)
        : [];
    const chon = chonChuDe(c.cauHinh, daDung, gsc);
    if (!chon) return { trangThai: "het-chu-de" };
    const lan = c.luot.filter((l) => l.ngay === homNay).reduce((m, l) => Math.max(m, l.lan + 1), 0);
    luot = { ngay: homNay, lan, chuDe: chon.chuDe, nguon: chon.nguon, batDauLuc: bayGio.toISOString() };
    c.luot.push(luot);
  }

  // Từ đây `luot` chắc chắn có — TypeScript không suy được qua lần gán lại bên trong nhánh.
  let luotDang: LuotLich = luot;

  // 3. Đọc tiến độ lượt từ bảng job, làm đúng một việc.
  //
  // Bước đăng bị website TỪ CHỐI NỘI DUNG thì không thử lại y nguyên (cùng bài
  // → cùng 403): lượt dừng, và mở ngay MỘT lượt viết lại trong ngày mang theo
  // các câu bị chạm. Chỉ một lần — viết lại mà vẫn bị từ chối thì để người xem.
  const docTienDo = async (l: LuotLich) => {
    const khoa = (b: number, lanThu: 0 | 1) => khoaBuocLich(projectId, l.ngay, l.lan, b, lanThu);
    const jobs = await repository.listByIdempotencyKeys(workspaceId, projectId, khoaCuaLuot(projectId, l));
    return { khoa, tienDo: tinhTienDo(BUOC_LICH_DANG, khoa, jobs, bayGio, (job) => laTuChoiNoiDung(job.errorMessage)) };
  };
  let { khoa, tienDo } = await docTienDo(luotDang);

  if (tienDo.hanhDong.loai === "danh-dau-ket") {
    try {
      await repository.setStatus(workspaceId, tienDo.hanhDong.jobId, "timed_out", bayGio, {
        errorCode: "MODULE_JOB_STALE",
        errorMessage: "Bước kẹt quá 15 phút — lịch đăng đánh dấu hết giờ để thử lại.",
      });
    } catch {
      // Job vừa đổi trạng thái bởi lượt chạy khác — đọc lại là đủ.
    }
    ({ khoa, tienDo } = await docTienDo(luotDang));
  }

  if (tienDo.hanhDong.loai === "dung" && laTuChoiNoiDung(tienDo.hanhDong.loi) && !luotDang.suaVi) {
    const viPham = docViPham(tienDo.hanhDong.loi);
    luotDang.ketQua = "dung";
    luotDang.loi = tienDo.hanhDong.loi;
    luotDang.xongLuc = bayGio.toISOString();
    const lanMoi = c.luot.filter((l) => l.ngay === luotDang.ngay).reduce((m, l) => Math.max(m, l.lan + 1), 0);
    luotDang = {
      ngay: luotDang.ngay,
      lan: lanMoi,
      chuDe: luotDang.chuDe,
      nguon: luotDang.nguon,
      batDauLuc: bayGio.toISOString(),
      suaVi: viPham.length ? viPham : ["(website không nêu câu cụ thể)"],
    };
    c.luot.push(luotDang);
    ({ khoa, tienDo } = await docTienDo(luotDang));
  }

  const hd = tienDo.hanhDong;
  switch (hd.loai) {
    case "cho":
      return { trangThai: "dang-cho", buoc: hd.buoc, jobId: hd.jobId };
    case "dung":
      luotDang.ketQua = "dung";
      luotDang.loi = hd.loi;
      luotDang.xongLuc = bayGio.toISOString();
      return { trangThai: "dung", buoc: hd.buoc, loi: hd.loi };
    case "xong": {
      const postUrl = typeof hd.dauRaCuoi?.postUrl === "string" ? hd.dauRaCuoi.postUrl : null;
      luotDang.ketQua = "da-dang";
      luotDang.postUrl = postUrl ?? undefined;
      luotDang.xongLuc = bayGio.toISOString();
      return { trangThai: "xong", postUrl };
    }
    case "danh-dau-ket":
      // Vừa đánh dấu xong mà vẫn ra đây là job đổi trạng thái giữa hai lần đọc.
      return { trangThai: "dang-cho", buoc: hd.buoc, jobId: hd.jobId };
    case "tao":
      break;
  }

  // 4. Tạo job cho bước kế.
  const role = await vaiTro(workspaceId, c.userId);
  if (!role) {
    luotDang.ketQua = "dung";
    luotDang.loi = "Người bật lịch không còn trong workspace.";
    luotDang.xongLuc = bayGio.toISOString();
    return { trangThai: "dung", buoc: hd.buoc, loi: luotDang.loi };
  }
  const duAn = await layDuAn(workspaceId, projectId);
  if (!duAn) return { trangThai: "loi", lyDo: "Không tìm thấy dự án." };

  const moduleKey = BUOC_LICH_DANG[hd.buoc]!;
  const view = toModuleDefinitionView(getModuleDefinition(moduleKey));
  const dauVao = dungDauVao(
    {
      key: moduleKey,
      fieldKeys: view.form.map((f) => f.key),
      asLinesKeys: view.form.filter((f) => f.asLines).map((f) => f.key),
    },
    poolCuaLuot(c.cauHinh, duAn, luotDang),
    { projectId, idempotencyKey: khoa(hd.buoc, hd.lan), ai: c.cauHinh.ai, upstreamJobIds: hd.upstreamJobIds },
  );

  let job;
  try {
    job = await getModuleJobService().create({ userId: c.userId, workspaceId, role }, moduleKey, dauVao);
  } catch (error) {
    const lyDo = error instanceof ValidationError ? error.message : error instanceof Error ? error.message : "Không tạo được job.";
    luotDang.ketQua = "dung";
    luotDang.loi = `Bước ${hd.buoc + 1}: ${lyDo}`;
    luotDang.xongLuc = bayGio.toISOString();
    return { trangThai: "dung", buoc: hd.buoc, loi: luotDang.loi };
  }

  const { userId } = c;
  const { buoc, lan } = hd;
  const goc = lua.goc;
  return {
    trangThai: "da-tao",
    buoc,
    lan,
    jobId: job.id,
    vietLai: Boolean(luotDang.suaVi),
    async chay() {
      // Job có thể đã ở trạng thái khác nếu hai lần gõ chồng nhau — engine tự
      // bỏ qua job không còn "queued".
      //
      // RÀO THỜI GIAN: chạy bước đua với một đồng hồ. Quá rào thì đánh dấu
      // job hết giờ và vẫn gõ tiếp — lượt kế sẽ thử lại bước này (lần 1). Nếu
      // không, hàm bị Vercel ngắt ở 300 giây mà chưa gõ tiếp: job kẹt "đang
      // chạy", lượt đứng im tới khi có ai gõ từ ngoài.
      let quaRao = false;
      // Đồng hồ phải được HUỶ khi bước xong trước — không thì hàm sống thêm
      // tới 250 giây chỉ để chờ một cái hẹn giờ không còn ý nghĩa.
      let henGio: ReturnType<typeof setTimeout> | undefined;
      const dongHo = new Promise<"qua-rao">((r) => {
        henGio = setTimeout(() => r("qua-rao"), raoBuocMs());
      });
      try {
        const kq = await Promise.race([runModuleJobAppNative(workspaceId, userId, job.id).then(() => "xong" as const), dongHo]);
        if (henGio) clearTimeout(henGio);
        if (kq === "qua-rao") {
          quaRao = true;
          try {
            await repository.setStatus(workspaceId, job.id, "timed_out", new Date(), {
              errorCode: "LICH_DANG_QUA_RAO",
              errorMessage: `Bước chạy quá ${Math.round(raoBuocMs() / 1000)} giây trong một lượt gọi — lịch đăng đánh dấu hết giờ để thử lại.`,
            });
          } catch {
            // Job vừa đổi trạng thái — không ghi đè.
          }
        }
      } catch (error) {
        if (henGio) clearTimeout(henGio);
        logger.error({ projectId, jobId: job.id, err: error instanceof Error ? error.message : "unknown" }, "lich_dang: buoc nem loi");
      } finally {
        if (goc) await tuGoTiep(goc, projectId);
      }
      if (quaRao) logger.warn({ projectId, jobId: job.id, buoc }, "lich_dang: buoc qua rao thoi gian");
    },
  };
}

async function layDuAn(workspaceId: string, projectId: string): Promise<{ name: string; website: string } | null> {
  const [row] =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({ name: pgProjects.name, website: pgProjects.website, status: pgProjects.status })
          .from(pgProjects)
          .where(and(eq(pgProjects.id, projectId), eq(pgProjects.workspaceId, workspaceId)))
          .limit(1)
      : await databaseAdapter.db
          .select({ name: projects.name, website: projects.website, status: projects.status })
          .from(projects)
          .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
          .limit(1);
  return row && row.status === "active" ? { name: row.name, website: row.website } : null;
}

/**
 * Tự gõ tiếp: gọi HTTP tới chính mình để bước kế chạy trong MỘT LƯỢT 300 GIÂY
 * MỚI. Chạy nối tiếp trong cùng lượt là đụng trần. Dùng mã đang lưu.
 *
 * Chờ tới khi máy chủ nhận yêu cầu (lượt mới trả lời ngay sau khi xếp lịch
 * `after()` của nó), không chờ bước kế chạy xong.
 */
async function tuGoTiep(goc: string, projectId: string): Promise<void> {
  const row = await timBanGhi(projectId);
  if (!row?.encryptedCredentials) return;
  let ma: string;
  try {
    ma = getVault().decrypt(row.encryptedCredentials, integrationCredentialContext(row.workspaceId, projectId, LOAI));
  } catch {
    return;
  }
  try {
    const r = await fetch(`${goc}/api/v1/lich-dang/${projectId}/tick`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ma}`, "x-lich-dang-tu-go": "1" },
      signal: AbortSignal.timeout(20_000),
    });
    logger.info({ projectId, status: r.status }, "lich_dang: tu go tiep");
  } catch (error) {
    // VPS gõ lại sau ≤10 phút — không mất gì, chỉ chậm.
    logger.warn({ projectId, err: error instanceof Error ? error.message : "unknown" }, "lich_dang: tu go tiep that bai");
  }
}

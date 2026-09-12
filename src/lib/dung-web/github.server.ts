import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { chuanBiChoCloudflare, mucGitTuCay, tenRepo } from "@/domain/dung-web/github-day";
import type { ThongTinTrang } from "@/domain/dung-web/dung-cay-tep";
import { soatCayTep } from "@/domain/dung-web/soat-cay-tep";
import { ValidationError } from "@/domain/shared/app-error";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { getVault } from "@/lib/auth/oauth.server";
import { databaseAdapter } from "@/lib/db";
import { pgOauthConnections } from "@/lib/db/postgres-schema";
import { oauthConnections } from "@/lib/db/schema";
import { docCauHinhDuAn, ghiCauHinhDuAn, xoaCauHinhDuAn } from "@/lib/integrations/cau-hinh-du-an.server";
import { getProjectService } from "@/lib/projects/project-service.server";
import { GitHubApi } from "./github-api";
import { dungWebChoDuAn } from "./tu-job.server";

/* ══════════════════════════════════════════════════════════════════════════
   TOKEN GITHUB CỦA NGƯỜI DÙNG + ĐẨY WEB KHÁCH LÊN KHO

   Token là "Personal access token" người dùng tự tạo trên GitHub — không có
   OAuth, nhưng lưu chung bảng `oauth_connections` (provider `github`): cùng
   phạm vi (workspace, user), cùng vault, cùng chỗ Cài đặt sẽ liệt kê. Không
   dựng một bảng thứ hai cho một cột token.

   AAD riêng cho GitHub — không mượn `getConnectionAad` của OAuth vì kiểu
   provider của hàm đó là Google/Make; nhét "github" vào đó là sửa kiểu ở bốn
   tệp không liên quan.
   ══════════════════════════════════════════════════════════════════════════ */

const PROVIDER = "github" as const;
const LOAI_TICH_HOP = "github_web" as const;

function aad(identity: Pick<AuthenticatedIdentity, "workspaceId" | "userId">): string {
  return `github/v1/${identity.workspaceId}/${identity.userId}`;
}

// Cùng vault với OAuth (thiếu khoá → ConfigurationError 500, không phải lỗi
// nhập liệu 400).
const vault = getVault;

export interface KetNoiGitHub {
  login: string;
  luuLuc: string;
}

async function docHang(identity: AuthenticatedIdentity): Promise<{ encryptedTokens: string; providerAccountId: string; updatedAt: Date } | undefined> {
  const [row] =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({
            encryptedTokens: pgOauthConnections.encryptedTokens,
            providerAccountId: pgOauthConnections.providerAccountId,
            updatedAt: pgOauthConnections.updatedAt,
            status: pgOauthConnections.status,
          })
          .from(pgOauthConnections)
          .where(
            and(
              eq(pgOauthConnections.workspaceId, identity.workspaceId),
              eq(pgOauthConnections.userId, identity.userId),
              eq(pgOauthConnections.provider, PROVIDER),
            ),
          )
          .limit(1)
      : await databaseAdapter.db
          .select({
            encryptedTokens: oauthConnections.encryptedTokens,
            providerAccountId: oauthConnections.providerAccountId,
            updatedAt: oauthConnections.updatedAt,
            status: oauthConnections.status,
          })
          .from(oauthConnections)
          .where(
            and(
              eq(oauthConnections.workspaceId, identity.workspaceId),
              eq(oauthConnections.userId, identity.userId),
              eq(oauthConnections.provider, PROVIDER),
            ),
          )
          .limit(1);
  return row && row.status === "active" ? row : undefined;
}

export async function ketNoiGitHub(identity: AuthenticatedIdentity): Promise<KetNoiGitHub | null> {
  const row = await docHang(identity);
  return row ? { login: row.providerAccountId, luuLuc: row.updatedAt.toISOString() } : null;
}

/** Token đã giải mã — CHỈ dùng phía máy chủ, không bao giờ trả về trình duyệt. */
async function tokenGitHub(identity: AuthenticatedIdentity): Promise<string | null> {
  const row = await docHang(identity);
  if (!row) return null;
  return vault().decrypt(row.encryptedTokens, aad(identity));
}

/**
 * Kiểm token bằng chính GitHub (lấy tên tài khoản) rồi mới lưu. Token sai thì
 * báo ngay ở đây — không phải ở lần đẩy đầu tiên, sau khi người dùng đã tin là
 * xong.
 */
export async function luuTokenGitHub(identity: AuthenticatedIdentity, token: string): Promise<KetNoiGitHub> {
  const sach = token.trim();
  if (sach.length < 20 || /\s/.test(sach)) {
    throw new ValidationError("GITHUB_TOKEN_INVALID", "Token GitHub không hợp lệ (dán nguyên chuỗi bắt đầu bằng github_pat_ hoặc ghp_).");
  }
  const { login } = await new GitHubApi(sach).nguoiDung();
  const now = new Date();
  const encryptedTokens = vault().encrypt(sach, aad(identity));
  const values = {
    id: randomUUID(),
    workspaceId: identity.workspaceId,
    userId: identity.userId,
    provider: PROVIDER,
    providerAccountId: login,
    providerEmail: null,
    displayLabel: `GitHub · ${login}`,
    scopes: ["repo"],
    encryptedTokens,
    accessTokenExpiresAt: null,
    status: "active" as const,
    lastVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  const capNhat = {
    providerAccountId: login,
    displayLabel: values.displayLabel,
    encryptedTokens,
    status: "active" as const,
    lastVerifiedAt: now,
    updatedAt: now,
  };
  if (databaseAdapter.kind === "neon") {
    await databaseAdapter.db
      .insert(pgOauthConnections)
      .values(values)
      .onConflictDoUpdate({
        target: [pgOauthConnections.workspaceId, pgOauthConnections.userId, pgOauthConnections.provider],
        set: capNhat,
      });
  } else {
    databaseAdapter.db
      .insert(oauthConnections)
      .values(values)
      .onConflictDoUpdate({
        target: [oauthConnections.workspaceId, oauthConnections.userId, oauthConnections.provider],
        set: capNhat,
      })
      .run();
  }
  return { login, luuLuc: now.toISOString() };
}

export async function xoaTokenGitHub(identity: AuthenticatedIdentity): Promise<boolean> {
  const dieuKien = (ws: typeof pgOauthConnections | typeof oauthConnections) =>
    and(eq(ws.workspaceId, identity.workspaceId), eq(ws.userId, identity.userId), eq(ws.provider, PROVIDER));
  if (databaseAdapter.kind === "neon") {
    const ra = await databaseAdapter.db.delete(pgOauthConnections).where(dieuKien(pgOauthConnections)).returning({ id: pgOauthConnections.id });
    return ra.length > 0;
  }
  const ra = databaseAdapter.db.delete(oauthConnections).where(dieuKien(oauthConnections)).returning({ id: oauthConnections.id }).all();
  return ra.length > 0;
}

/* ─────────────────────────── Kho của từng dự án ────────────────────────── */

export interface KhoWeb {
  owner: string;
  repo: string;
  url: string;
  nhanh: string;
  dayLuc: string;
  sha: string;
  soTep: number;
}

export async function khoWebCuaDuAn(projectId: string): Promise<KhoWeb | null> {
  const c = (await docCauHinhDuAn(projectId, LOAI_TICH_HOP)) as Partial<KhoWeb & { soTep: string | number }> | null;
  if (!c?.owner || !c.repo) return null;
  return {
    owner: c.owner,
    repo: c.repo,
    url: c.url ?? `https://github.com/${c.owner}/${c.repo}`,
    nhanh: c.nhanh ?? "main",
    dayLuc: c.dayLuc ?? "",
    sha: c.sha ?? "",
    soTep: Number(c.soTep ?? 0),
  };
}

async function ghiKhoWeb(projectId: string, kho: KhoWeb): Promise<void> {
  await ghiCauHinhDuAn(projectId, LOAI_TICH_HOP, { ...kho, soTep: String(kho.soTep) });
}

export async function xoaKhoWeb(projectId: string): Promise<boolean> {
  return xoaCauHinhDuAn(projectId, LOAI_TICH_HOP);
}

export type KetQuaDayWeb =
  | { trangThai: "ok"; kho: KhoWeb; lanDau: boolean; soLoiNang: number }
  | { trangThai: "loi"; lyDo: string };

/**
 * Dựng cây tệp từ đầu ra các bước (cùng nguồn với .zip), chuẩn bị cho
 * Cloudflare, rồi đẩy TRỌN lên kho `web-<slug>` của tài khoản GitHub đã lưu.
 * Kho chưa có thì tạo (riêng tư). Lần sau đẩy vào cùng kho — Cloudflare thấy
 * commit mới là tự dựng lại.
 */
export async function dayWebLenGitHub(
  identity: AuthenticatedIdentity,
  projectId: string,
  thongTin: ThongTinTrang,
  /** Id ảnh Drive làm ảnh mở đầu. */
  anhMoDau?: string,
): Promise<KetQuaDayWeb> {
  const token = await tokenGitHub(identity);
  if (!token) return { trangThai: "loi", lyDo: "Chưa lưu token GitHub." };
  await getProjectService().get(identity, projectId);

  const kq = await dungWebChoDuAn(identity, projectId, thongTin, true, anhMoDau);
  if (!kq) return { trangThai: "loi", lyDo: "Chưa có kiến trúc — chạy luồng «Dựng website — bản nháp» trước." };
  const soLoiNang = soatCayTep(kq.cay).filter((l) => l.muc === "nang").length;

  const api = new GitHubApi(token);
  const cu = await khoWebCuaDuAn(projectId);
  const { login } = await api.nguoiDung();
  let owner: string;
  let repo: string;
  let nhanh: string;
  let url: string;
  let lanDau = false;
  if (cu) {
    const tt = await api.thongTinRepo(cu.owner, cu.repo);
    if (!tt.co) {
      // 404 có hai nghĩa: kho không còn, HOẶC token này không nhìn thấy kho
      // riêng tư của một thành viên khác trong workspace. Bảo "xoá liên kết
      // rồi đẩy lại" trong trường hợp hai là tạo kho thứ hai trong khi
      // Cloudflare vẫn nối kho thứ nhất.
      return {
        trangThai: "loi",
        lyDo:
          cu.owner !== login
            ? `Kho ${cu.owner}/${cu.repo} thuộc tài khoản GitHub «${cu.owner}», còn token đang lưu là của «${login}» nên không thấy được. Dùng token của ${cu.owner}, hoặc bỏ liên kết nếu thật sự muốn tạo kho mới.`
            : `Kho ${cu.owner}/${cu.repo} không còn trên GitHub (đã xoá hoặc đổi tên). Xoá liên kết rồi đẩy lại để tạo kho mới.`,
      };
    }
    ({ owner, repo } = cu);
    nhanh = tt.nhanhMacDinh;
    url = tt.url;
  } else {
    lanDau = true;
    const ten = tenRepo(kq.hopDong.kienTruc.tenWebsite);
    const tt = await api.thongTinRepo(login, ten);
    if (tt.co) {
      // Kho cùng tên đã có. CHỈ dùng lại nếu chính Antigravity tạo (mô tả kho
      // ghi vậy lúc tạo). Kho khác của người dùng trùng tên mà đẩy vào là thay
      // sạch nội dung kho đó bằng website — lấy lại được qua lịch sử git,
      // nhưng không ai đáng phải làm việc đó.
      if (!/Antigravity/i.test(tt.moTa)) {
        return {
          trangThai: "loi",
          lyDo: `Trên GitHub đã có kho ${login}/${ten} không phải do Antigravity tạo. Đổi tên website trong kiến trúc, hoặc đổi tên/xoá kho đó rồi đẩy lại.`,
        };
      }
      owner = login;
      repo = ten;
      nhanh = tt.nhanhMacDinh;
      url = tt.url;
    } else {
      const moi = await api.taoRepo(ten, `Website ${kq.hopDong.kienTruc.tenWebsite} — do Antigravity dựng`);
      ({ owner, repo, url } = moi);
      nhanh = moi.nhanhMacDinh;
      // README của `auto_init` tới sau 201 vài trăm mili giây — chờ có nhánh.
      await api.choNhanhSanSang(owner, repo, nhanh);
    }
  }

  const muc = mucGitTuCay(chuanBiChoCloudflare(kq.cay));
  const day = await api.dayCay(owner, repo, nhanh, muc, `Antigravity: bản dựng ${new Date().toISOString().slice(0, 16).replace("T", " ")} (${muc.length} tệp)`);
  const kho: KhoWeb = { owner, repo, url, nhanh, dayLuc: new Date().toISOString(), sha: day.sha, soTep: day.soTep };
  await ghiKhoWeb(projectId, kho);
  // `lanDau` = lần đầu CỦA DỰ ÁN NÀY (chưa có liên kết) — để thẻ hiện ba bước
  // nối Cloudflare. Không dùng `day.lanDau` (nhánh chưa có): kho tạo bằng
  // auto_init luôn có nhánh sẵn.
  return { trangThai: "ok", kho, lanDau, soLoiNang };
}

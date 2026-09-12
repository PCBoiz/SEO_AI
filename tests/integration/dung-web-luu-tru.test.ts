import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";
import { projects, users, workspaceMembers, workspaces } from "@/lib/db/schema";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";

/**
 * Ba kho nhỏ của trình dựng web ghi vào CSDL THẬT (SQLite tạm, có migration):
 *
 *   · số điện thoại/Zalo của web khách (`dung_web`) — nhớ để khỏi gõ lại;
 *   · token GitHub của người dùng (`oauth_connections`, provider `github`) —
 *     mã hoá vault, đọc lại được, xoá được, không lộ ra ngoài;
 *   · kho GitHub của dự án (`github_web`).
 *
 * Không gọi mạng: GitHub được giả ở tầng fetch để `luuTokenGitHub` kiểm token.
 */

const giu = vi.hoisted(() => ({ adapter: null as unknown }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  get databaseAdapter() {
    return giu.adapter;
  },
}));

import { randomUUID } from "node:crypto";
import { SqliteModuleJobRepository } from "@/infrastructure/modules/sqlite-module-job-repository";
import "@/domain/modules/registry";
import { docThongTinWeb, ghiThongTinWeb } from "@/lib/dung-web/thong-tin-web.server";
import { dayWebLenGitHub, ketNoiGitHub, khoWebCuaDuAn, luuTokenGitHub, xoaKhoWeb, xoaTokenGitHub } from "@/lib/dung-web/github.server";

const CHU: AuthenticatedIdentity = {
  userId: "u1",
  displayName: "Chủ",
  workspaceId: "ws1",
  workspaceName: "W",
  workspaceSlug: "w",
  role: "owner",
};

const thuMuc: string[] = [];
let adapterDangMo: SqliteDatabaseAdapter | null = null;

afterEach(async () => {
  delete process.env.VAULT_ENCRYPTION_KEY;
  vi.unstubAllGlobals();
  adapterDangMo?.close();
  adapterDangMo = null;
  await Promise.all(thuMuc.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function dung(): Promise<SqliteDatabaseAdapter> {
  const root = await mkdtemp(path.join(os.tmpdir(), "antigravity-luu-tru-"));
  thuMuc.push(root);
  const adapter = new SqliteDatabaseAdapter(path.join(root, "test.db"));
  adapterDangMo = adapter;
  migrate(adapter.db, { migrationsFolder: path.resolve("drizzle") });
  giu.adapter = adapter;
  process.env.VAULT_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("hex");
  const now = new Date("2026-09-13T00:00:00Z");
  adapter.db.insert(workspaces).values({ id: "ws1", name: "W", slug: "w", createdAt: now, updatedAt: now }).run();
  adapter.db
    .insert(users)
    .values({ id: "u1", email: "u@x.test", displayName: "Chủ", passwordHash: "x", status: "active", createdAt: now, updatedAt: now })
    .run();
  adapter.db.insert(workspaceMembers).values({ workspaceId: "ws1", userId: "u1", role: "owner", createdAt: now, updatedAt: now }).run();
  adapter.db
    .insert(projects)
    .values({ id: "p1", workspaceId: "ws1", name: "Minh Anh Land", website: "https://minhanhland.vn", language: "Tiếng Việt", tone: "Điềm đạm", createdAt: now, updatedAt: now })
    .run();
  return adapter;
}

describe("nhớ số điện thoại/Zalo của web khách", () => {
  it("chưa lưu → null; lưu rồi đọc lại đúng; lưu lần hai ghi đè, không nhân đôi dòng", async () => {
    await dung();
    expect(await docThongTinWeb("p1")).toBeNull();
    await ghiThongTinWeb("p1", { dienThoai: "0912 345 678", zalo: "0912345678" });
    expect(await docThongTinWeb("p1")).toMatchObject({ dienThoai: "0912 345 678", zalo: "0912345678" });
    await ghiThongTinWeb("p1", { dienThoai: "0988 000 111" });
    expect(await docThongTinWeb("p1")).toMatchObject({ dienThoai: "0988 000 111", zalo: "" });
    // Số trống thì không ghi gì (không xoá số cũ).
    await ghiThongTinWeb("p1", { dienThoai: "   " });
    expect((await docThongTinWeb("p1"))?.dienThoai).toBe("0988 000 111");
  });
});

describe("token GitHub và kho web của dự án", () => {
  it("token: kiểm với GitHub (giả) rồi lưu mã hoá; đọc lại chỉ ra tên tài khoản; xoá được", async () => {
    const adapter = await dung();
    const goi: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      goi.push(`${init?.method ?? "GET"} ${url}`);
      return new Response(JSON.stringify({ login: "cogiang" }), { status: 200 });
    });
    expect(await ketNoiGitHub(CHU)).toBeNull();
    const kn = await luuTokenGitHub(CHU, "github_pat_gia_lap_1234567890abcdef");
    expect(kn.login).toBe("cogiang");
    expect(goi).toEqual(["GET https://api.github.com/user"]);
    expect((await ketNoiGitHub(CHU))?.login).toBe("cogiang");
    // Token trong CSDL đã mã hoá — không còn chuỗi gốc.
    const hang = adapter.db.all<{ encrypted_tokens: string; provider: string }>(
      "select encrypted_tokens, provider from oauth_connections",
    );
    expect(hang).toHaveLength(1);
    expect(hang[0]!.provider).toBe("github");
    expect(hang[0]!.encrypted_tokens).not.toContain("github_pat_gia_lap");
    // Lưu lần hai (token mới) ghi đè, vẫn một dòng.
    await luuTokenGitHub(CHU, "github_pat_gia_lap_khac_0987654321");
    expect(adapter.db.all("select id from oauth_connections")).toHaveLength(1);
    expect(await xoaTokenGitHub(CHU)).toBe(true);
    expect(await ketNoiGitHub(CHU)).toBeNull();
    expect(await xoaTokenGitHub(CHU)).toBe(false);
  });

  it("token sai (GitHub trả 401) thì KHÔNG lưu, và ném lỗi có câu của GitHub", async () => {
    await dung();
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401 }));
    await expect(luuTokenGitHub(CHU, "github_pat_sai_1234567890abcdef")).rejects.toThrow(/401.*Bad credentials/);
    expect(await ketNoiGitHub(CHU)).toBeNull();
    // Token quá ngắn bị chặn trước khi gọi mạng.
    await expect(luuTokenGitHub(CHU, "abc")).rejects.toThrow(/không hợp lệ/);
  });

  it("kho web của dự án: chưa có → null; xoá liên kết trả đúng cờ", async () => {
    await dung();
    expect(await khoWebCuaDuAn("p1")).toBeNull();
    expect(await xoaKhoWeb("p1")).toBe(false);
  });
});

/* ───────────────── Đẩy trọn đường: CSDL thật → cây → GitHub giả ───────────────── */

const KIEN_TRUC = {
  tenWebsite: "Minh Anh Land",
  nganh: "bat-dong-san",
  khoiChung: ["site-header", "site-footer", "lien-he-noi"],
  trang: [
    { duong: "/", tieuDe: "Trang chủ", mucDich: "Khách xem quỹ căn rồi để lại số.", khoi: [{ ma: "hero-anh", noiDung: "a" }, { ma: "quy-can-xem-truoc", noiDung: "b" }] },
  ],
  canVietMoi: [],
  duLieuCan: [],
};

async function gieoKienTruc(adapter: SqliteDatabaseAdapter): Promise<void> {
  const kho = new SqliteModuleJobRepository(adapter.db);
  const now = new Date();
  const { job } = await kho.create({
    id: randomUUID(),
    workspaceId: "ws1",
    userId: "u1",
    projectId: "p1",
    moduleKey: "RIS_WEB_KIEN_TRUC",
    idempotencyKey: `thu:${randomUUID()}`,
    input: { projectId: "p1" },
    now,
  });
  await kho.setStatus("ws1", job.id, "succeeded", now, { output: { json: "```json\n" + JSON.stringify(KIEN_TRUC) + "\n```" } });
}

/** GitHub giả có trạng thái: kho tồn tại hay chưa, mô tả kho, ghi lại từng lượt gọi. */
function gitHubGia(khoi: { khoCo?: { moTa: string; nhanh?: string } } = {}) {
  const goi: Array<{ method: string; duong: string; than?: Record<string, unknown> }> = [];
  let khoCo = khoi.khoCo ?? null;
  let demBlob = 0;
  let coNhanh = Boolean(khoCo);
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const duong = url.replace("https://api.github.com", "");
    const method = init?.method ?? "GET";
    const than = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : undefined;
    goi.push({ method, duong, than });
    const tra = (status: number, du: unknown) => new Response(JSON.stringify(du), { status });
    if (duong === "/user") return tra(200, { login: "cogiang" });
    if (method === "GET" && /^\/repos\/cogiang\/[^/]+$/.test(duong)) {
      return khoCo
        ? tra(200, { default_branch: khoCo.nhanh ?? "main", html_url: `https://github.com${duong.replace("/repos", "")}`, description: khoCo.moTa })
        : tra(404, { message: "Not Found" });
    }
    if (method === "POST" && duong === "/user/repos") {
      khoCo = { moTa: String(than?.description ?? "") };
      coNhanh = true;
      return tra(201, { name: than?.name, owner: { login: "cogiang" }, default_branch: "main", html_url: `https://github.com/cogiang/${String(than?.name)}` });
    }
    if (method === "GET" && duong.includes("/git/ref/heads/")) return coNhanh ? tra(200, { object: { sha: "cha000" } }) : tra(404, {});
    if (method === "POST" && duong.endsWith("/git/blobs")) return tra(201, { sha: `blob${++demBlob}` });
    if (method === "POST" && duong.endsWith("/git/trees")) return tra(201, { sha: "tree1" });
    if (method === "POST" && duong.endsWith("/git/commits")) return tra(201, { sha: `commit${demBlob}` });
    if (method === "PATCH" && duong.includes("/git/refs/heads/")) return tra(200, {});
    if (method === "POST" && duong.endsWith("/git/refs")) return tra(201, {});
    return tra(500, { message: `không có kịch bản ${method} ${duong}` });
  });
  return { goi };
}

describe("đẩy web khách lên GitHub — trọn đường với CSDL thật và GitHub giả", () => {
  // MỘT phép thử cho cả chuỗi: `getProjectService()` là singleton giữ kết nối
  // CSDL của lần gọi đầu, nên mỗi `it` mở một CSDL mới là nó trỏ vào kết nối
  // đã đóng ("database connection is not open"). Thứ tự bên trong là thứ tự
  // người dùng gặp thật.
  it("từ chối khi thiếu token/kiến trúc → lần đầu tạo kho riêng tư + đẩy cây Cloudflare → lần hai dùng lại kho → kho lạ trùng tên thì từ chối", async () => {
    const adapter = await dung();

    // 1. Chưa có token.
    expect(await dayWebLenGitHub(CHU, "p1", { dienThoai: "0912 345 678" })).toEqual({ trangThai: "loi", lyDo: "Chưa lưu token GitHub." });

    // 2. Có token, chưa có kiến trúc.
    let { goi } = gitHubGia();
    await luuTokenGitHub(CHU, "github_pat_gia_lap_1234567890abcdef");
    const chuaKienTruc = await dayWebLenGitHub(CHU, "p1", { dienThoai: "0912 345 678" });
    expect(chuaKienTruc.trangThai).toBe("loi");
    expect((chuaKienTruc as { lyDo: string }).lyDo).toContain("Chưa có kiến trúc");

    // 3. Lần đầu: tạo kho, đẩy cây.
    await gieoKienTruc(adapter);
    goi.length = 0;
    const kq = await dayWebLenGitHub(CHU, "p1", { dienThoai: "0912 345 678", zalo: "0912345678", diaChi: "https://minhanhland.vn" });
    expect(kq.trangThai).toBe("ok");
    if (kq.trangThai !== "ok") return;
    expect(kq.lanDau).toBe(true);
    expect(kq.kho).toMatchObject({ owner: "cogiang", repo: "web-minh-anh-land", nhanh: "main" });
    expect(kq.soLoiNang).toBe(0);
    const taoKho = goi.find((g) => g.method === "POST" && g.duong === "/user/repos")!.than!;
    expect(taoKho).toMatchObject({ name: "web-minh-anh-land", private: true, auto_init: true });
    expect(String(taoKho.description)).toContain("Antigravity");
    // Cây đẩy lên là bản Cloudflare: cấu hình ở gốc, thong-tin.ts mang số thật và Zalo đã chuẩn hoá.
    const cay = goi.find((g) => g.duong.endsWith("/git/trees"))!.than as { tree: Array<{ path: string }> };
    const duong = cay.tree.map((t) => t.path);
    expect(duong).toContain("wrangler.jsonc");
    expect(duong).toContain("open-next.config.ts");
    expect(duong).toContain("src/lib/thong-tin.ts");
    expect(duong).toContain("src/components/khoi/quy-can-xem-truoc.tsx");
    const blobs = goi.filter((g) => g.duong.endsWith("/git/blobs")).map((g) => String(g.than!.content));
    const thongTin = blobs.find((b) => b.includes("export const THONG_TIN"))!;
    expect(thongTin).toContain('dienThoai: "0912 345 678"');
    expect(thongTin).toContain('zalo: "https://zalo.me/0912345678"');
    expect(thongTin).toContain('diaChi: "https://minhanhland.vn"');
    expect(await khoWebCuaDuAn("p1")).toMatchObject({ owner: "cogiang", repo: "web-minh-anh-land" });

    // 4. Lần hai: không tạo kho, PATCH nhánh.
    goi.length = 0;
    const lan2 = await dayWebLenGitHub(CHU, "p1", { dienThoai: "0912 345 678" });
    expect(lan2.trangThai).toBe("ok");
    expect((lan2 as { lanDau: boolean }).lanDau).toBe(false);
    expect(goi.some((g) => g.duong === "/user/repos")).toBe(false);
    expect(goi.some((g) => g.method === "PATCH")).toBe(true);

    // 5. Bỏ liên kết, GitHub giờ có kho cùng tên KHÔNG do Antigravity tạo → từ chối, không đẩy đè.
    expect(await xoaKhoWeb("p1")).toBe(true);
    ({ goi } = gitHubGia({ khoCo: { moTa: "Kho riêng của tôi" } }));
    const la = await dayWebLenGitHub(CHU, "p1", { dienThoai: "0912 345 678" });
    expect(la.trangThai).toBe("loi");
    expect((la as { lyDo: string }).lyDo).toContain("không phải do Antigravity tạo");
    expect(goi.some((g) => g.duong.endsWith("/git/blobs"))).toBe(false);
    expect(await khoWebCuaDuAn("p1")).toBeNull();
  });
});

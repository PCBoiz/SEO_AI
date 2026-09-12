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

import { docThongTinWeb, ghiThongTinWeb } from "@/lib/dung-web/thong-tin-web.server";
import { ketNoiGitHub, khoWebCuaDuAn, luuTokenGitHub, xoaKhoWeb, xoaTokenGitHub } from "@/lib/dung-web/github.server";

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

import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it, vi } from "vitest";
import { khachLienHeSchema } from "@/domain/lead/khach-lien-he";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";
import { projectIntegrations, projects, workspaces } from "@/lib/db/schema";
import { Vault } from "@/lib/vault";
import { nhanKhach } from "@/lib/integrations/lead-sheet.server";

/**
 * Dấu vết lượt nhận ở cổng khách liên hệ.
 *
 * Sinh ra từ lỗi thật 12/09: website gửi khách đi KHÔNG KÈM TOKEN (compose bên
 * kho site quên chuyển `LEAD_WEBHOOK_TOKEN` vào hộp chứa). Cổng trả 401 trước
 * khi ghi dấu vết, nên thẻ trên trang dự án hiện "Chưa nhận lượt nào từ
 * website" — câu sai, dẫn chủ dự án đi kiểm sai chỗ.
 */

const giu = vi.hoisted(() => ({
  adapter: null as unknown,
  vault: null as unknown,
  noiDong: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  get databaseAdapter() {
    return giu.adapter;
  },
}));
vi.mock("@/lib/auth/oauth.server", () => ({ getVault: () => giu.vault }));
vi.mock("@/lib/google/sheets.server", () => ({
  noiDong: (...a: unknown[]) => giu.noiDong(...a),
  taoBang: vi.fn(),
}));
vi.mock("@/lib/projects/project-service.server", () => ({ getProjectService: vi.fn() }));

const TOKEN = "t".repeat(64);
const KHACH = khachLienHeSchema.parse({ dienThoai: "0941234567", hoTen: "Khách thử" });
const thuMuc: string[] = [];
let adapterDangMo: SqliteDatabaseAdapter | null = null;

afterEach(async () => {
  vi.useRealTimers();
  giu.noiDong.mockReset();
  adapterDangMo?.close();
  adapterDangMo = null;
  await Promise.all(thuMuc.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function dung(): Promise<SqliteDatabaseAdapter> {
  const root = await mkdtemp(path.join(os.tmpdir(), "antigravity-lead-"));
  thuMuc.push(root);
  const adapter = new SqliteDatabaseAdapter(path.join(root, "test.db"));
  adapterDangMo = adapter;
  migrate(adapter.db, { migrationsFolder: path.resolve("drizzle") });
  const vault = new Vault(Buffer.alloc(32, 9).toString("hex"));
  giu.adapter = adapter;
  giu.vault = vault;

  const now = new Date();
  adapter.db.insert(workspaces).values({ id: "ws1", name: "W", slug: "w", createdAt: now, updatedAt: now }).run();
  adapter.db
    .insert(projects)
    .values({
      id: "p1",
      workspaceId: "ws1",
      name: "Hạ Long Xanh",
      website: "https://halongxanh360.vn",
      language: "vi",
      tone: "Chuyên nghiệp",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  adapter.db
    .insert(projectIntegrations)
    .values({
      id: "i1",
      projectId: "p1",
      type: "lead_sheet",
      status: "configured",
      config: {
        spreadsheetId: "sheet-1",
        spreadsheetUrl: "https://docs.google.com/spreadsheets/d/sheet-1",
        userId: "u1",
        lapLuc: now.toISOString(),
      },
      encryptedCredentials: vault.encrypt(TOKEN, "workspace:ws1:project:p1:integration:lead_sheet"),
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return adapter;
}

function cauHinh(adapter: SqliteDatabaseAdapter): Record<string, string> {
  const [r] = adapter.db
    .select({ config: projectIntegrations.config })
    .from(projectIntegrations)
    .where(eq(projectIntegrations.projectId, "p1"))
    .all();
  return r.config as Record<string, string>;
}

describe("cổng nhận khách — dấu vết cho chủ dự án", () => {
  it("THIẾU token: vẫn từ chối, nhưng để lại dấu 'thieu-token' chứ không im lặng", async () => {
    const adapter = await dung();
    const kq = await nhanKhach("p1", "", KHACH);

    expect(kq).toEqual({ trangThai: "sai-token" });
    const c = cauHinh(adapter);
    expect(c.ketQuaCuoi).toBe("thieu-token");
    expect(c.lanNhanCuoi).toBeTruthy();
    // Ghi dấu vết là GỘP vào config — không được xoá chỗ bảng đang trỏ tới.
    expect(c.spreadsheetId).toBe("sheet-1");
    expect(giu.noiDong).not.toHaveBeenCalled();
  });

  it("SAI token: dấu 'sai-token', không chạm Google", async () => {
    const adapter = await dung();
    const kq = await nhanKhach("p1", "khong-dung", KHACH);

    expect(kq).toEqual({ trangThai: "sai-token" });
    expect(cauHinh(adapter).ketQuaCuoi).toBe("sai-token");
    expect(giu.noiDong).not.toHaveBeenCalled();
  });

  it("lượt bị từ chối ghi tối đa một lần mỗi phút — người lạ không biến cổng thành cửa ghi DB", async () => {
    const adapter = await dung();
    vi.useFakeTimers({ toFake: ["Date"] });
    const t0 = new Date("2026-09-12T08:00:00Z");

    vi.setSystemTime(t0);
    await nhanKhach("p1", "", KHACH);
    expect(cauHinh(adapter)).toMatchObject({ ketQuaCuoi: "thieu-token", lanNhanCuoi: t0.toISOString() });

    vi.setSystemTime(new Date(t0.getTime() + 30_000));
    await nhanKhach("p1", "khong-dung", KHACH);
    expect(cauHinh(adapter)).toMatchObject({ ketQuaCuoi: "thieu-token", lanNhanCuoi: t0.toISOString() });

    vi.setSystemTime(new Date(t0.getTime() + 61_000));
    await nhanKhach("p1", "khong-dung", KHACH);
    expect(cauHinh(adapter).ketQuaCuoi).toBe("sai-token");
  });

  it("ĐÚNG token: nối dòng bằng token Google của người lập bảng, dấu 'ok' — kể cả ngay sau lượt bị từ chối", async () => {
    const adapter = await dung();
    giu.noiDong.mockResolvedValue({ trangThai: "ok", duLieu: { updatedRange: "Khach!A2:H2" } });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-12T08:00:00Z"));
    await nhanKhach("p1", "", KHACH);

    vi.setSystemTime(new Date("2026-09-12T08:00:05Z"));
    const kq = await nhanKhach("p1", TOKEN, KHACH);

    expect(kq).toEqual({ trangThai: "ok", updatedRange: "Khach!A2:H2" });
    expect(giu.noiDong).toHaveBeenCalledTimes(1);
    const [chu, spreadsheetId, dong] = giu.noiDong.mock.calls[0] as [unknown, string, string[]];
    expect(chu).toEqual({ workspaceId: "ws1", userId: "u1" });
    expect(spreadsheetId).toBe("sheet-1");
    expect(dong).toContain("0941234567");
    // Lượt thành công KHÔNG bị giới hạn một-lần-mỗi-phút.
    expect(cauHinh(adapter)).toMatchObject({ ketQuaCuoi: "ok", lanNhanCuoi: "2026-09-12T08:00:05.000Z" });
  });

  it("Google từ chối: dấu 'loi: <lý do>' để chủ dự án đọc được", async () => {
    const adapter = await dung();
    giu.noiDong.mockResolvedValue({ trangThai: "loi", lyDo: "API Google Sheets chưa bật." });
    const kq = await nhanKhach("p1", TOKEN, KHACH);

    expect(kq).toEqual({ trangThai: "khong-ghi-duoc", lyDo: "API Google Sheets chưa bật." });
    expect(cauHinh(adapter).ketQuaCuoi).toBe("loi: API Google Sheets chưa bật.");
  });
});

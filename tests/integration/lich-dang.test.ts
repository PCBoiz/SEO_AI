import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BUOC_LICH_DANG, type CauHinhLich } from "@/domain/lich-dang/lich-dang";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { moduleJobs, projectIntegrations, projects, users, workspaceMembers, workspaces } from "@/lib/db/schema";
import { Vault } from "@/lib/vault";

/**
 * Lịch đăng bài — chạy THẬT trên SQLite, engine module thật, chỉ giả ba thứ
 * chạm ra ngoài: model AI, cổng nhận bài của website, Search Console.
 *
 * Mỗi ca gọi `goNhip` như VPS gọi, rồi tự chạy `chay()` như `after()` sẽ chạy.
 * Không tự gõ tiếp (không truyền `goc`) để từng bước đọc được bằng mắt.
 */

const giu = vi.hoisted(() => ({
  adapter: null as unknown,
  vault: null as unknown,
  /** Lời gọi AI theo thứ tự — để đối chiếu ngữ cảnh đi vào từng bước. */
  loiGoiAi: [] as { model: string; prompt: string }[],
  /** Ném lỗi khi prompt chứa chuỗi này (mỗi lần gặp trừ đi một). */
  hongKhi: null as null | { chua: string; conLai: number },
  /** Treo mãi (không trả lời) khi prompt chứa chuỗi này — giả nhà cung cấp đơ. */
  treoKhi: null as null | string,
  baiDaNhan: [] as Record<string, unknown>[],
  truyVanGsc: [] as { truyVan: string; viTri: number; impressions: number }[],
  /** Website giả từ chối bài (403 + vi phạm) chừng này lần trước khi nhận. */
  tuChoiConLai: 0,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  get databaseAdapter() {
    return giu.adapter;
  },
}));
vi.mock("@/lib/auth/oauth.server", () => ({ getVault: () => giu.vault }));
vi.mock("@/lib/projects/project-service.server", () => ({
  getProjectService: () => ({ get: async () => ({}) }),
}));
vi.mock("@/lib/seo/search-console.server", () => ({
  layTruyVanChoLich: async () => giu.truyVanGsc,
}));
// Drive giả: hai ảnh; tải trả byte giả. Thu nhỏ = trả nguyên (không cần sharp trong test).
vi.mock("@/lib/google/drive.server", () => ({
  lietKeAnh: async () => ({
    trangThai: "ok",
    duLieu: [
      { id: "1AbCdEfGhIjKlMnOpQrStUv", ten: "tien-do-0826-len-tang.webp", mimeType: "image/webp", taoLuc: "", rong: 1568, cao: 962, coThuNho: true, thuMucCon: "" },
      { id: "2AbCdEfGhIjKlMnOpQrStUv", ten: "song-le-hoi.webp", mimeType: "image/webp", taoLuc: "", rong: 2560, cao: 1358, coThuNho: true, thuMucCon: "" },
    ],
  }),
  taiAnh: async (_c: unknown, _f: string, id: string) => ({
    trangThai: "ok",
    duLieu: { bytes: Buffer.from(`byte-${id}`), mimeType: "image/webp", ten: `${id}.webp` },
  }),
  docMoTaAnh: async () => new Map([["tien-do-0826-len-tang.webp", "Ba khối công trình đang lên tầng, tháng 08/2026"]]),
}));
vi.mock("@/lib/google/anh-web.server", () => ({
  thuAnhChoWeb: async (bytes: Buffer) => ({ bytes, mime: "image/webp", rong: 1, cao: 1 }),
}));
vi.mock("@/lib/ai/ai-provider-registry.server", () => ({
  getUserAiModelProvider: (o: { provider: string; model: string }) => ({
    id: o.provider,
    model: o.model,
    mode: "live",
    async generate(r: { prompt: string }) {
      giu.loiGoiAi.push({ model: o.model, prompt: r.prompt });
      if (giu.treoKhi && r.prompt.includes(giu.treoKhi)) {
        giu.treoKhi = null;
        return new Promise(() => {});
      }
      if (giu.hongKhi && r.prompt.includes(giu.hongKhi.chua) && giu.hongKhi.conLai > 0) {
        giu.hongKhi.conLai -= 1;
        throw new Error("Nhà cung cấp AI trả 429 (giả)");
      }
      const text = r.prompt.includes("JSON-LD")
        ? '<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}</script>'
        : r.prompt.includes("Danh sách ảnh (số")
          ? '{"chon":[{"so":1,"alt":"AI mô tả"}]}'
          : `## Kết quả thử\n\nNội dung sinh cho: ${r.prompt.slice(0, 60).replace(/\n/g, " ")}`;
      return { provider: o.provider, model: o.model, mode: "live", text, usage: {}, durationMs: 1 };
    },
  }),
}));

import { goNhip, luuCauHinhLich, taoMaMoi, trangThaiLich } from "@/lib/lich-dang/lich-dang.server";
import { getAiKeyService } from "@/lib/ai/ai-key-service.server";

const CAU_HINH: CauHinhLich = {
  bat: true,
  gioChay: 6,
  ai: { provider: "deepseek", model: "deepseek-v4-flash" },
  chuyenMuc: "Thị trường",
  audienceBrief: "Môi giới bất động sản Hạ Long, khách mua để ở và đầu tư dài hạn.",
  location: "Hạ Long, Quảng Ninh",
  language: "Tiếng Việt",
  tone: "Chuyên nghiệp, rõ ràng",
  chuDe: ["Giá biệt thự đảo Hạ Long Xanh 2026"],
  dungSearchConsole: true,
};

const CHU: AuthenticatedIdentity = {
  userId: "u1",
  displayName: "Chủ",
  workspaceId: "ws1",
  workspaceName: "W",
  workspaceSlug: "w",
  role: "owner",
};

// 06:05 sáng giờ Việt Nam ngày 12/09 = 23:05 UTC ngày 11/09.
const LUC_0605 = new Date("2026-09-11T23:05:00Z");
const LUC_0500 = new Date("2026-09-11T22:00:00Z");

const thuMuc: string[] = [];
let adapterDangMo: SqliteDatabaseAdapter | null = null;
const fetchThat = globalThis.fetch;

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  giu.loiGoiAi = [];
  giu.hongKhi = null;
  giu.treoKhi = null;
  giu.baiDaNhan = [];
  giu.truyVanGsc = [];
  giu.tuChoiConLai = 0;
  delete process.env.VINHOMES_SITE_URL;
  delete process.env.VINHOMES_INGEST_TOKEN;
  delete process.env.VAULT_ENCRYPTION_KEY;
  delete process.env.LICH_DANG_RAO_MS;
  adapterDangMo?.close();
  adapterDangMo = null;
  await Promise.all(thuMuc.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function dung(): Promise<SqliteDatabaseAdapter> {
  process.env.LICH_DANG_RAO_MS = "300";
  const root = await mkdtemp(path.join(os.tmpdir(), "antigravity-lich-"));
  thuMuc.push(root);
  const adapter = new SqliteDatabaseAdapter(path.join(root, "test.db"));
  adapterDangMo = adapter;
  migrate(adapter.db, { migrationsFolder: path.resolve("drizzle") });
  giu.adapter = adapter;
  // Đồng hồ giả: `updatedAt` của job do dịch vụ đặt bằng `new Date()`, còn
  // lịch nhận `bayGio` — hai cái phải cùng một đồng hồ, không thì job vừa tạo
  // đã "kẹt quá 15 phút".
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(LUC_0500);
  // Dịch vụ khoá AI dựng Vault từ biến môi trường; cổng khác qua `getVault()`
  // đã giả — cùng một khoá để cả hai đọc được của nhau.
  const khoaVault = Buffer.alloc(32, 5).toString("hex");
  process.env.VAULT_ENCRYPTION_KEY = khoaVault;
  giu.vault = new Vault(khoaVault);

  const now = new Date("2026-09-01T00:00:00Z");
  adapter.db.insert(workspaces).values({ id: "ws1", name: "W", slug: "w", createdAt: now, updatedAt: now }).run();
  adapter.db
    .insert(users)
    .values({ id: "u1", email: "u@x.test", displayName: "Chủ", passwordHash: "x", status: "active", createdAt: now, updatedAt: now })
    .run();
  adapter.db.insert(workspaceMembers).values({ workspaceId: "ws1", userId: "u1", role: "owner", createdAt: now, updatedAt: now }).run();
  adapter.db
    .insert(projects)
    .values({
      id: "p1",
      workspaceId: "ws1",
      name: "Hạ Long Xanh 360",
      website: "https://halongxanh360.vn",
      language: "Tiếng Việt",
      tone: "Chuyên nghiệp",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  await getAiKeyService().saveKey("u1", "deepseek", "sk-thu-nghiem-123456", "deepseek-v4-flash");

  // Website giả: nhận bài, trả "chờ duyệt". Các URL khác đi qua fetch thật.
  process.env.VINHOMES_SITE_URL = "http://127.0.0.1:47555";
  process.env.VINHOMES_INGEST_TOKEN = "khoa-dang-bai";
  vi.stubGlobal("fetch", async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url instanceof Request ? url.url : url);
    if (u.startsWith("http://127.0.0.1:47555/api/ingest")) {
      if (giu.tuChoiConLai > 0) {
        giu.tuChoiConLai -= 1;
        return new Response(
          JSON.stringify({
            loi: "Bài chạm luật cấm.",
            viPham: [
              { luat: "cam-ket-loi-nhuan", lyDo: "Cam kết lợi nhuận…", trichDan: "cam kết sinh lời 12%/năm" },
              { luat: "danh-xung-nhat", lyDo: "Danh xưng nhất…", trichDan: "đẳng cấp nhất Việt Nam" },
            ],
            chiTiet: "[cam-ket-loi-nhuan] … Chỗ chạm: “cam kết sinh lời 12%/năm”",
          }),
          { status: 403, headers: { "content-type": "application/json" } },
        );
      }
      giu.baiDaNhan.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ trangThai: "cho", thongBao: "Bài đang chờ duyệt." }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }
    return fetchThat(url, init);
  });
  return adapter;
}

function demJob(adapter: SqliteDatabaseAdapter) {
  return adapter.db.select().from(moduleJobs).where(eq(moduleJobs.projectId, "p1")).all();
}

/** Một lần gõ tại thời điểm `luc` — đồng hồ hệ thống cũng đặt theo. */
function go(ma: string | null, luc: Date, lua: Parameters<typeof goNhip>[2] = {}) {
  vi.setSystemTime(luc);
  return goNhip("p1", ma, lua, luc);
}

/** Gõ cho tới khi lượt chốt, chạy từng bước như `after()`; trả dãy kết quả. */
async function goToiXong(ma: string, luc: Date, toiDa = 30): Promise<string[]> {
  const dau: string[] = [];
  for (let i = 0; i < toiDa; i += 1) {
    const kq = await go(ma, luc);
    dau.push(kq.trangThai === "da-tao" ? `tao:${kq.buoc}${kq.lan ? "r" : ""}` : kq.trangThai);
    if (kq.trangThai === "da-tao") {
      await kq.chay();
      continue;
    }
    if (kq.trangThai !== "dang-cho") return dau;
  }
  return dau;
}

describe("lịch đăng bài — một ngày một bài, chạy thật trên SQLite", () => {
  it("lưu lần đầu sinh mã kích hoạt; sai mã / thiếu mã đều bị từ chối", async () => {
    await dung();
    const kq = await luuCauHinhLich(CHU, "p1", CAU_HINH);
    expect(kq.trangThai).toBe("ok");
    const ma = (kq as { maMoi: string }).maMoi;
    expect(ma).toMatch(/^[0-9a-f]{64}$/);

    expect(await go("sai", LUC_0605)).toEqual({ trangThai: "sai-ma" });
    expect(await go(null, LUC_0605)).toEqual({ trangThai: "sai-ma" });
    expect(await goNhip("khong-co", ma, {}, LUC_0605)).toEqual({ trangThai: "chua-lap" });
    // Lưu lại KHÔNG sinh mã mới — crontab đã dán mã cũ.
    expect(await luuCauHinhLich(CHU, "p1", CAU_HINH)).toEqual({ trangThai: "ok", maMoi: null });
  });

  it("từ chối bật lịch khi người lưu chưa có khoá AI của nhà cung cấp đã chọn", async () => {
    await dung();
    const kq = await luuCauHinhLich(CHU, "p1", { ...CAU_HINH, ai: { provider: "openai", model: "gpt-5-mini" } });
    expect(kq).toMatchObject({ trangThai: "loi" });
    expect((kq as { lyDo: string }).lyDo).toContain("API key openai");
  });

  it("trước giờ thì không làm gì; tới giờ thì đi trọn 8 bước → bài vào hàng chờ duyệt với NGÀY CỦA LƯỢT", async () => {
    const adapter = await dung();
    const { maMoi: ma } = (await luuCauHinhLich(CHU, "p1", CAU_HINH)) as { maMoi: string };

    expect(await go(ma, LUC_0500)).toEqual({ trangThai: "chua-toi-gio", gioChay: 6 });
    expect(demJob(adapter)).toHaveLength(0);

    const dau = await goToiXong(ma, LUC_0605);
    expect(dau).toEqual(["tao:0", "tao:1", "tao:2", "tao:3", "tao:4", "tao:5", "tao:6", "tao:7", "tao:8", "xong"]);

    const jobs = demJob(adapter);
    expect(jobs).toHaveLength(BUOC_LICH_DANG.length);
    expect(jobs.every((j) => j.status === "succeeded")).toBe(true);
    // Mỗi bước sau mang mã các bước trước của CHÍNH lượt này.
    const cuoi = jobs.find((j) => j.moduleKey === "RIS_VHGG_PUBLISH")!;
    expect((cuoi.inputPayload as { upstreamJobIds: string[] }).upstreamJobIds).toHaveLength(8);

    expect(giu.baiDaNhan).toHaveLength(1);
    expect(giu.baiDaNhan[0]).toMatchObject({ chuyenMuc: "Thị trường", ngayDang: "2026-09-12" });
    expect(String(giu.baiDaNhan[0]!.noiDung)).toContain("Kết quả thử");
    // Không có bước #13 — không tốn một lượt AI cho llms.txt/sitemap.
    expect(jobs.map((j) => j.moduleKey)).not.toContain("RIS_GEO_FILES");

    const tt = await trangThaiLich(CHU, "p1");
    expect(tt.luot[0]).toMatchObject({ ngay: "2026-09-12", lan: 0, chuDe: CAU_HINH.chuDe[0], nguon: "danh-sach", ketQua: "da-dang" });
    expect(tt.luot[0]!.postUrl).toMatch(/^http:\/\/127\.0\.0\.1:47555\/tin-tuc\//);
    expect(tt.ketQuaGoCuoi).toBe("xong");

    // Gõ thêm trong ngày: không mở lượt thứ hai, không tạo thêm job.
    expect(await go(ma, new Date("2026-09-12T08:00:00Z"))).toMatchObject({ trangThai: "xong" });
    expect(demJob(adapter)).toHaveLength(BUOC_LICH_DANG.length);
  });

  it("dự án đã nối Drive: bước chọn ảnh chọn từ danh sách, bước đăng gửi kèm base64 + alt từ CSV", async () => {
    const adapter = await dung();
    adapter.db
      .insert(projectIntegrations)
      .values({
        id: "i-drive",
        projectId: "p1",
        type: "drive_folder",
        status: "configured",
        config: { folderId: "1FolderAbCdEfGhIjKlMnOp", ten: "Ảnh", userId: "u1", noiLuc: new Date().toISOString() },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run();
    const { maMoi: ma } = (await luuCauHinhLich(CHU, "p1", CAU_HINH)) as { maMoi: string };
    const dau = await goToiXong(ma, LUC_0605);
    expect(dau.at(-1)).toBe("xong");
    const anh = giu.baiDaNhan[0]!.anh as Array<{ mime: string; base64: string; alt: string }>;
    expect(anh).toHaveLength(1);
    expect(anh[0]).toMatchObject({ mime: "image/webp", alt: "Ba khối công trình đang lên tầng, tháng 08/2026" });
    expect(Buffer.from(anh[0]!.base64, "base64").toString()).toBe("byte-1AbCdEfGhIjKlMnOpQrStUv");
    const jobChon = demJob(adapter).find((j) => j.moduleKey === "RIS_CHON_ANH")!;
    expect(String((jobChon.outputPayload as { danhSach: string }).danhSach)).toContain("1AbCdEfGhIjKlMnOpQrStUv | tien-do-0826-len-tang.webp");
  });

  it("chưa nối Drive: bước chọn ảnh trả rỗng không gọi AI, bài đăng không có trường `anh`", async () => {
    await dung();
    const { maMoi: ma } = (await luuCauHinhLich(CHU, "p1", CAU_HINH)) as { maMoi: string };
    await goToiXong(ma, LUC_0605);
    expect(giu.baiDaNhan[0]).not.toHaveProperty("anh");
    expect(giu.loiGoiAi.some((g) => g.prompt.includes("Danh sách ảnh (số"))).toBe(false);
  });

  it("gõ trùng lúc (VPS + tự gõ tiếp) không tạo job trùng — khoá tất định", async () => {
    const adapter = await dung();
    const { maMoi: ma } = (await luuCauHinhLich(CHU, "p1", CAU_HINH)) as { maMoi: string };
    const a = await go(ma, LUC_0605);
    const b = await go(ma, LUC_0605);
    expect(a.trangThai).toBe("da-tao");
    expect(b).toMatchObject({ trangThai: "dang-cho", buoc: 0, jobId: (a as { jobId: string }).jobId });
    expect(demJob(adapter)).toHaveLength(1);
  });

  it("hết danh sách thì lấy truy vấn Search Console vị trí 11–30 cho ngày hôm sau", async () => {
    await dung();
    const { maMoi: ma } = (await luuCauHinhLich(CHU, "p1", CAU_HINH)) as { maMoi: string };
    await goToiXong(ma, LUC_0605);

    giu.truyVanGsc = [
      { truyVan: "vinhomes hạ long", viTri: 12, impressions: 5000 },
      { truyVan: "pháp lý dự án hạ long xanh sổ hồng", viTri: 22, impressions: 300 },
    ];
    const homSau = new Date("2026-09-12T23:05:00Z");
    const dau = await goToiXong(ma, homSau);
    expect(dau.at(-1)).toBe("xong");
    const tt = await trangThaiLich(CHU, "p1");
    expect(tt.luot[0]).toMatchObject({ ngay: "2026-09-13", chuDe: "pháp lý dự án hạ long xanh sổ hồng", nguon: "search-console", ketQua: "da-dang" });
    expect(giu.baiDaNhan[1]).toMatchObject({ ngayDang: "2026-09-13" });

    // Ngày kế: cả hai nguồn cạn → hết chủ đề, không tạo job.
    giu.truyVanGsc = [];
    expect(await go(ma, new Date("2026-09-13T23:05:00Z"))).toEqual({ trangThai: "het-chu-de" });
  });

  it("bước hỏng: thử lại đúng một lần; hỏng nữa thì dừng lượt, ghi lý do, hôm sau thử lại chủ đề", async () => {
    const adapter = await dung();
    const haiChuDe = { ...CAU_HINH, chuDe: [...CAU_HINH.chuDe, "Tiến độ phân khu Paradise Bay tháng 9"] };
    const { maMoi: ma } = (await luuCauHinhLich(CHU, "p1", haiChuDe)) as { maMoi: string };

    // Bước 4 (mở đầu) hỏng một lần rồi chạy được.
    giu.hongKhi = { chua: "mở đầu", conLai: 1 };
    const dau = await goToiXong(ma, LUC_0605);
    expect(dau).toContain("tao:4r");
    expect(dau.at(-1)).toBe("xong");
    expect(demJob(adapter).filter((j) => j.status === "failed")).toHaveLength(1);

    // Hôm sau: bước 3 hỏng hai lần → dừng.
    giu.hongKhi = { chua: "tiêu đề", conLai: 2 };
    const homSau = new Date("2026-09-12T23:05:00Z");
    const dau2 = await goToiXong(ma, homSau);
    expect(dau2.at(-1)).toBe("dung");
    const tt = await trangThaiLich(CHU, "p1");
    expect(tt.luot[0]).toMatchObject({ ngay: "2026-09-13", ketQua: "dung" });
    expect(tt.luot[0]!.loi).toContain("429");
    // Trong ngày không mở lại; gõ tiếp chỉ kể lại.
    expect(await go(ma, new Date("2026-09-13T02:00:00Z"))).toMatchObject({ trangThai: "dung", buoc: -1 });
    expect(giu.baiDaNhan).toHaveLength(1);

    // Ngày kế: chủ đề mới hỏng MỘT lượt nên được thử lại — và lần này xong.
    giu.hongKhi = null;
    const dau3 = await goToiXong(ma, new Date("2026-09-13T23:05:00Z"));
    expect(dau3.at(-1)).toBe("xong");
    expect((await trangThaiLich(CHU, "p1")).luot[0]).toMatchObject({
      ngay: "2026-09-14",
      chuDe: "Tiến độ phân khu Paradise Bay tháng 9",
      ketQua: "da-dang",
    });
    expect(giu.baiDaNhan).toHaveLength(2);
  });

  it("bước kẹt 'running' quá 15 phút thì đánh dấu hết giờ và thử lại", async () => {
    const adapter = await dung();
    const { maMoi: ma } = (await luuCauHinhLich(CHU, "p1", CAU_HINH)) as { maMoi: string };
    const a = await go(ma, LUC_0605);
    expect(a.trangThai).toBe("da-tao");
    const jobId = (a as { jobId: string }).jobId;
    // Giả một lượt `after()` bị ngắt giữa chừng: job ở "running" và không ai đổi nữa.
    adapter.db.update(moduleJobs).set({ status: "running", updatedAt: LUC_0605 }).where(eq(moduleJobs.id, jobId)).run();

    const sau16 = new Date(LUC_0605.getTime() + 16 * 60_000);
    const b = await go(ma, sau16);
    expect(b).toMatchObject({ trangThai: "da-tao", buoc: 0, lan: 1 });
    const cu = adapter.db.select().from(moduleJobs).where(eq(moduleJobs.id, jobId)).all()[0]!;
    expect(cu.status).toBe("timed_out");
  });

  it("'Chạy thử ngay' mở lượt bất kể giờ, bằng phiên đăng nhập; lượt thứ hai trong ngày có lan = 1", async () => {
    await dung();
    await luuCauHinhLich(CHU, "p1", { ...CAU_HINH, chuDe: ["Chủ đề A thử nghiệm", "Chủ đề B thử nghiệm"] });
    const a = await go(null, LUC_0500, { identity: CHU, epMoLuot: true });
    expect(a).toMatchObject({ trangThai: "da-tao", buoc: 0, lan: 0 });
    await (a as { chay: () => Promise<void> }).chay();
    // Chạy hết lượt bằng mã (như VPS sẽ làm).
    const ma = await taoMaMoi(CHU, "p1");
    await goToiXong(ma, LUC_0500);
    const tt1 = await trangThaiLich(CHU, "p1");
    expect(tt1.luot[0]).toMatchObject({ lan: 0, chuDe: "Chủ đề A thử nghiệm", ketQua: "da-dang" });

    const b = await go(null, LUC_0500, { identity: CHU, epMoLuot: true });
    expect(b).toMatchObject({ trangThai: "da-tao", buoc: 0, lan: 0 });
    const tt2 = await trangThaiLich(CHU, "p1");
    expect(tt2.dangDo?.luot).toMatchObject({ ngay: "2026-09-12", lan: 1, chuDe: "Chủ đề B thử nghiệm" });
    // Phiên của workspace khác thì không.
    expect(await goNhip("p1", null, { identity: { ...CHU, workspaceId: "ws9" }, epMoLuot: true }, LUC_0500)).toEqual({ trangThai: "chua-lap" });
  });

  it("nhà cung cấp AI đơ: bước quá rào thời gian → đánh dấu hết giờ, lượt kế thử lại (không kẹt theo hàm)", async () => {
    const adapter = await dung();
    const { maMoi: ma } = (await luuCauHinhLich(CHU, "p1", CAU_HINH)) as { maMoi: string };
    giu.treoKhi = "Chủ đề/từ khóa chính"; // bước 1 treo mãi
    vi.useRealTimers(); // rào dùng setTimeout thật (LICH_DANG_RAO_MS=300 trong test)
    const a = await goNhip("p1", ma, {}, LUC_0605);
    expect(a.trangThai).toBe("da-tao");
    const batDau = Date.now();
    await (a as { chay: () => Promise<void> }).chay();
    expect(Date.now() - batDau).toBeLessThan(5_000);
    const jobId = (a as { jobId: string }).jobId;
    const job = adapter.db.select().from(moduleJobs).where(eq(moduleJobs.id, jobId)).all()[0]!;
    expect(job.status).toBe("timed_out");
    expect(job.errorCode).toBe("LICH_DANG_QUA_RAO");
    vi.useFakeTimers({ toFake: ["Date"] });
    const b = await go(ma, new Date(LUC_0605.getTime() + 60_000));
    expect(b).toMatchObject({ trangThai: "da-tao", buoc: 0, lan: 1 });
  });

  it("dấu vết nguồn gõ: VPS ghi lanGoVpsCuoi, tự gõ tiếp / bấm tay thì không", async () => {
    await dung();
    const { maMoi: ma } = (await luuCauHinhLich(CHU, "p1", CAU_HINH)) as { maMoi: string };
    await go(ma, LUC_0500, { nguon: "tu-go" });
    let tt = await trangThaiLich(CHU, "p1");
    expect(tt).toMatchObject({ nguonGoCuoi: "tu-go", lanGoVpsCuoi: null });
    await go(null, LUC_0500, { identity: CHU });
    tt = await trangThaiLich(CHU, "p1");
    expect(tt).toMatchObject({ nguonGoCuoi: "tay", lanGoVpsCuoi: null });
    await go(ma, LUC_0500);
    tt = await trangThaiLich(CHU, "p1");
    expect(tt).toMatchObject({ nguonGoCuoi: "vps", lanGoVpsCuoi: LUC_0500.toISOString() });
  });

  it("website TỪ CHỐI nội dung: không gửi lại bài cũ, mở lượt viết lại mang câu bị chạm, lần hai được nhận", async () => {
    const adapter = await dung();
    const { maMoi: ma } = (await luuCauHinhLich(CHU, "p1", CAU_HINH)) as { maMoi: string };
    giu.tuChoiConLai = 1;
    const dau = await goToiXong(ma, LUC_0605);
    // 9 bước lượt 0 → đăng bị 403 → KHÔNG "tao:8r" → lượt viết lại chạy trọn 9 bước.
    expect(dau.filter((d) => d === "tao:8r")).toHaveLength(0);
    expect(dau.at(-1)).toBe("xong");
    expect(dau.filter((d) => d.startsWith("tao:")).length).toBe(18);

    const tt = await trangThaiLich(CHU, "p1");
    expect(tt.luot[0]).toMatchObject({ ngay: "2026-09-12", lan: 1, chuDe: CAU_HINH.chuDe[0], ketQua: "da-dang" });
    expect(tt.luot[0]!.suaVi).toEqual(["[cam-ket-loi-nhuan] “cam kết sinh lời 12%/năm”", "[danh-xung-nhat] “đẳng cấp nhất Việt Nam”"]);
    expect(tt.luot[1]).toMatchObject({ ngay: "2026-09-12", lan: 0, ketQua: "dung" });
    expect(tt.luot[1]!.loi).toContain("TỪ CHỐI vì nội dung");
    expect(giu.baiDaNhan).toHaveLength(1);

    // Mọi bước viết đều thấy LUẬT, và lượt viết lại thấy chính câu bị chạm.
    const promptLuot0 = giu.loiGoiAi.slice(0, 4).map((g) => g.prompt).join("\n");
    expect(promptLuot0).toContain("QUY TẮC BẮT BUỘC KHI VIẾT");
    expect(promptLuot0).not.toContain("LẦN TRƯỚC BÀI BỊ WEBSITE TỪ CHỐI");
    const promptLuot1 = giu.loiGoiAi.slice(-6).map((g) => g.prompt).join("\n");
    expect(promptLuot1).toContain("LẦN TRƯỚC BÀI BỊ WEBSITE TỪ CHỐI");
    expect(promptLuot1).toContain("cam kết sinh lời 12%/năm");
    // Bài đăng KHÔNG mang khối luật (luật chỉ ở lời nhắc, không ở nội dung bài).
    expect(String(giu.baiDaNhan[0]!.noiDung)).not.toContain("QUY TẮC BẮT BUỘC");
    expect(demJob(adapter)).toHaveLength(18);
  });

  it("viết lại mà vẫn bị từ chối → dừng hẳn trong ngày, không mở lượt thứ ba", async () => {
    const adapter = await dung();
    const { maMoi: ma } = (await luuCauHinhLich(CHU, "p1", CAU_HINH)) as { maMoi: string };
    giu.tuChoiConLai = 2;
    const dau = await goToiXong(ma, LUC_0605);
    expect(dau.at(-1)).toBe("dung");
    expect(demJob(adapter)).toHaveLength(18);
    const tt = await trangThaiLich(CHU, "p1");
    expect(tt.luot.map((l) => [l.lan, l.ketQua])).toEqual([[1, "dung"], [0, "dung"]]);
    expect(giu.baiDaNhan).toHaveLength(0);
    // Trong ngày gõ tiếp chỉ kể lại — không lượt mới.
    expect(await go(ma, new Date("2026-09-12T05:00:00Z"))).toMatchObject({ trangThai: "dung", buoc: -1 });
    expect(demJob(adapter)).toHaveLength(18);
  });

  it("tạo mã mới làm mã cũ hết hiệu lực ngay", async () => {
    await dung();
    const { maMoi: cu } = (await luuCauHinhLich(CHU, "p1", CAU_HINH)) as { maMoi: string };
    const moi = await taoMaMoi(CHU, "p1");
    expect(await go(cu, LUC_0500)).toEqual({ trangThai: "sai-ma" });
    expect(await go(moi, LUC_0500)).toEqual({ trangThai: "chua-toi-gio", gioChay: 6 });
  });

  it("tắt lịch: gõ không làm gì, nhưng lượt đang dở vẫn được chạy nốt", async () => {
    const adapter = await dung();
    const { maMoi: ma } = (await luuCauHinhLich(CHU, "p1", CAU_HINH)) as { maMoi: string };
    const a = await go(ma, LUC_0605);
    await (a as { chay: () => Promise<void> }).chay();
    await luuCauHinhLich(CHU, "p1", { ...CAU_HINH, bat: false });
    const dau = await goToiXong(ma, LUC_0605);
    expect(dau.at(-1)).toBe("xong");
    expect(demJob(adapter)).toHaveLength(BUOC_LICH_DANG.length);
    expect(await go(ma, new Date("2026-09-12T23:05:00Z"))).toEqual({ trangThai: "tat" });
  });
});

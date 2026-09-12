import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { projects, users, workspaceMembers, workspaces } from "@/lib/db/schema";
import { Vault } from "@/lib/vault";

/**
 * Trình dựng website chạy THẬT qua đường job của ứng dụng.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO CẦN, KHI TỪNG MODULE ĐÃ CÓ TEST ĐƠN VỊ
 *
 * Test đơn vị gọi thẳng `definition.execute()` với `upstream` do chính test
 * dựng ra. Nó KHÔNG chứng minh được ba thứ chỉ tồn tại khi chạy qua engine:
 *
 *   1. đầu ra của #24 đi tới #25 qua bảng job (`flattenModuleOutput` biến
 *      object thành text có nhãn — JSON nằm trong khối ```json giữa chữ);
 *   2. `parseModuleInput` nhận đúng đầu vào mà giao diện gửi (thiếu trường
 *      mặc định là job chết ngay trước khi model được gọi);
 *   3. cây tệp cuối cùng dựng được từ ĐÚNG những gì còn lại trong cơ sở dữ
 *      liệu, không phải từ biến trong bộ nhớ test.
 *
 * Giả đúng một thứ: model AI. Cơ sở dữ liệu, engine, registry, kho khoá đều thật.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const giu = vi.hoisted(() => ({
  adapter: null as unknown,
  vault: null as unknown,
  loiGoiAi: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  get databaseAdapter() {
    return giu.adapter;
  },
}));
vi.mock("@/lib/auth/oauth.server", () => ({ getVault: () => giu.vault }));

const KIEN_TRUC_AI = {
  tenWebsite: "Nha khoa Bình Minh",
  nganh: "chung",
  khoiChung: ["site-header", "site-footer", "lien-he-noi"],
  trang: [
    {
      duong: "/",
      tieuDe: "Trang chủ",
      mucDich: "Người đau răng gọi ngay trong đêm.",
      khoi: [
        { ma: "hero-anh", noiDung: "Khám trong ngày, có bác sĩ trực tối." },
        { ma: "cau-hoi-thuong-gap", noiDung: "Câu hỏi hay gặp." },
        { ma: "dang-ky-form", noiDung: "Để lại số." },
      ],
    },
  ],
  canVietMoi: [],
  duLieuCan: ["số giấy phép"],
};

const THIET_KE_AI = {
  mau: { nen: "#0b1f1a", chu: "#f4f1ea", nhan: "#2fb583", phu: "#9fb5ad" },
  font: { tieuDe: "Fraunces", than: "Be Vietnam Pro" },
  khoangCach: "thoang",
  goc: "bo-nhe",
  giong: ["điềm đạm", "rõ ràng"],
  lyDo: "Khách xem buổi tối, nền tối đỡ chói.",
};

/** Model giả: đọc lời nhắc để biết đang ở bước nào rồi trả đúng khuôn bước đó. */
vi.mock("@/lib/ai/ai-provider-registry.server", () => ({
  getUserAiModelProvider: (o: { provider: string; model: string }) => ({
    id: o.provider,
    model: o.model,
    mode: "live",
    async generate(r: { prompt: string }) {
      giu.loiGoiAi.push(r.prompt);
      const text = r.prompt.includes("Viết bản Ý ĐỊNH")
        ? "## Vấn đề\n- Khách đau răng lúc đêm không biết chỗ nào mở.\n## Không làm\n- Không đặt lịch online."
        : r.prompt.includes("DANH MỤC KHỐI")
          ? "```json\n" + JSON.stringify(KIEN_TRUC_AI) + "\n```"
          : r.prompt.includes("Font tiêu đề")
            ? "```json\n" + JSON.stringify(THIET_KE_AI) + "\n```"
            : // #27: viết chữ cho từng khối của một trang
              JSON.stringify({
                "0": { tieuDe: "Đau răng đêm nay? Có bác sĩ trực.", dan: "Mở tới 22h mỗi ngày.", nut: "Đặt lịch" },
                "1": { muc: [{ tieuDe: "Nhổ răng khôn có đau không?", than: "Có tê tại chỗ." }] },
                "2": { tieuDe: "Để lại số, chúng tôi gọi lại", dan: "Gọi lại trong 10 phút." },
              });
      return { provider: o.provider, model: o.model, mode: "live", text, usage: {}, durationMs: 1 };
    },
  }),
}));

import { getAiKeyService } from "@/lib/ai/ai-key-service.server";
import { getModuleJobService } from "@/lib/modules/module-service.server";
import { getModuleJobRepository, runModuleJobAppNative } from "@/lib/modules/module-engine.server";
import { flattenModuleOutput, getModuleDefinition } from "@/domain/modules/module-definition";
import { docHopDongTuDauRa } from "@/domain/dung-web/tu-dau-ra";
import { dungCayTep } from "@/domain/dung-web/dung-cay-tep";
import { websiteDraftModuleKeys } from "@/domain/modules/registry";

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
  giu.loiGoiAi = [];
  delete process.env.VAULT_ENCRYPTION_KEY;
  adapterDangMo?.close();
  adapterDangMo = null;
  await Promise.all(thuMuc.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function dung(): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "antigravity-web-"));
  thuMuc.push(root);
  const adapter = new SqliteDatabaseAdapter(path.join(root, "test.db"));
  adapterDangMo = adapter;
  migrate(adapter.db, { migrationsFolder: path.resolve("drizzle") });
  giu.adapter = adapter;

  const khoaVault = Buffer.alloc(32, 7).toString("hex");
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
      name: "Nha khoa Bình Minh",
      website: "https://binh-minh.example",
      language: "Tiếng Việt",
      tone: "Điềm đạm",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  await getAiKeyService().saveKey("u1", "deepseek", "sk-thu-nghiem-123456", "deepseek-v4-flash");
}

/** Tạo job rồi chạy nó ngay — đúng thứ tự mà tuyến API + `after()` làm. */
async function chayModule(moduleKey: string, them: Record<string, unknown> = {}): Promise<void> {
  const job = await getModuleJobService().create(CHU, moduleKey, {
    projectId: "p1",
    idempotencyKey: crypto.randomUUID(),
    ai: { provider: "deepseek", model: "deepseek-v4-flash" },
    ...them,
  });
  await runModuleJobAppNative("ws1", "u1", job.id);
}

async function dauRaMoiNhat(): Promise<Map<string, string>> {
  const jobs = await getModuleJobRepository().listLatestSucceededByProject("ws1", "p1");
  const ra = new Map<string, string>();
  for (const j of jobs) {
    if (j.output) ra.set(j.moduleKey, flattenModuleOutput(getModuleDefinition(j.moduleKey), j.output));
  }
  return ra;
}

describe("dựng website — bốn bước chạy qua engine thật", () => {
  it("chạy #24 → #27 rồi dựng ra cây tệp có đúng chữ AI đã viết", async () => {
    await dung();

    await chayModule("RIS_WEB_Y_DINH", {
      audienceBrief: "Phòng khám nha khoa ở Hạ Long, mở tới 22h, khách đau răng buổi tối.",
      siteName: "Nha khoa Bình Minh",
      nganh: "nha khoa",
    });
    await chayModule("RIS_WEB_KIEN_TRUC", { nganh: "chung", soTrangToiDa: 3 });
    await chayModule("RIS_WEB_THIET_KE", { goiY: "xanh trầm" });
    await chayModule("RIS_WEB_VIET_CHU", { suThat: "Điện thoại 0912 345 678. Mở 8h–22h." });

    // Bốn bước đều thành công và đúng thứ tự khai trong preset.
    const jobs = await getModuleJobRepository().listLatestSucceededByProject("ws1", "p1");
    expect(jobs.map((j) => j.moduleKey).sort()).toEqual([...websiteDraftModuleKeys].sort());

    // Nối luồng THẬT: #25 nhìn thấy Ý định, #27 nhìn thấy JSON kiến trúc.
    const nhacKienTruc = giu.loiGoiAi.find((p) => p.includes("DANH MỤC KHỐI"))!;
    expect(nhacKienTruc).toContain("Khách đau răng lúc đêm");
    const nhacVietChu = giu.loiGoiAi.at(-1)!;
    expect(nhacVietChu).toContain("0912 345 678");
    expect(nhacVietChu).toContain("[hero-anh]");

    // Từ cơ sở dữ liệu ra cây tệp.
    const hopDong = docHopDongTuDauRa(await dauRaMoiNhat())!;
    expect(hopDong.thieu).toEqual([]);
    expect(hopDong.kienTruc.tenWebsite).toBe("Nha khoa Bình Minh");
    expect(hopDong.thietKe.mau.nhan).toBe("#2fb583");

    const { cay, boQua } = dungCayTep(hopDong.kienTruc, hopDong.thietKe, { dienThoai: "0912 345 678" }, hopDong.chu);
    expect(boQua).toEqual([]);
    const theo = new Map(cay.tep.map((t) => [t.duongDan, typeof t.noiDung === "string" ? t.noiDung : ""]));
    expect(theo.get("src/components/khoi/hero-anh.tsx")).toContain("Đau răng đêm nay? Có bác sĩ trực.");
    expect(theo.get("src/components/khoi/cau-hoi-thuong-gap.tsx")).toContain("Nhổ răng khôn có đau không?");
    expect(theo.get("src/app/globals.css")).toContain("--nhan: #2fb583;");
    expect(theo.get("src/app/page.tsx")).toContain('import MoDau from "@/components/khoi/hero-anh";');
  }, 30_000);

  it("chạy #25 khi CHƯA có ý định thì job hỏng với câu nói rõ phải làm gì", async () => {
    await dung();
    await chayModule("RIS_WEB_KIEN_TRUC", { nganh: "chung" });
    const jobs = await getModuleJobRepository().listRecentForModule("ws1", "p1", "RIS_WEB_KIEN_TRUC", 1);
    expect(jobs[0]!.status).toBe("failed");
    expect(jobs[0]!.errorMessage).toContain("Ý định");
  }, 20_000);

  it("chưa chạy bước nào thì không có gì để dựng", async () => {
    await dung();
    expect(docHopDongTuDauRa(await dauRaMoiNhat())).toBeNull();
  }, 20_000);
});

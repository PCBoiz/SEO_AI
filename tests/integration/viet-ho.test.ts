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
 * "AI viết hộ" đi trọn đường thật: dịch vụ job → engine (AI giả) → lịch sử
 * theo ô, kể cả bản-trước-khi-AI-viết để quay về.
 */

const giu = vi.hoisted(() => ({
  adapter: null as unknown,
  vault: null as unknown,
  traLoi: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  get databaseAdapter() {
    return giu.adapter;
  },
}));
vi.mock("@/lib/auth/oauth.server", () => ({ getVault: () => giu.vault }));
// Dịch vụ dự án thật là singleton giữ adapter của test đầu — giả cho gọn, chỉ
// cần đúng một luật: khác workspace thì không thấy dự án.
vi.mock("@/lib/projects/project-service.server", () => ({
  getProjectService: () => ({
    get: async (identity: { workspaceId: string }) => {
      if (identity.workspaceId !== "ws1") throw new Error("PROJECT_NOT_FOUND");
      return {};
    },
  }),
}));
vi.mock("@/lib/ai/ai-provider-registry.server", () => ({
  getUserAiModelProvider: (o: { provider: string; model: string }) => ({
    id: o.provider,
    model: o.model,
    mode: "live",
    async generate() {
      const text = giu.traLoi.shift() ?? "Nội dung AI viết.";
      return { provider: o.provider, model: o.model, mode: "live", text, usage: {}, durationMs: 1 };
    },
  }),
}));

import { getAiKeyService } from "@/lib/ai/ai-key-service.server";
import { lichSuVietHo } from "@/lib/ai/viet-ho.server";
import { runModuleJobAppNative } from "@/lib/modules/module-engine.server";
import { getModuleJobService } from "@/lib/modules/module-service.server";

const CHU: AuthenticatedIdentity = {
  userId: "u1",
  displayName: "Chủ",
  workspaceId: "ws1",
  workspaceName: "W",
  workspaceSlug: "w",
  role: "editor",
};

const thuMuc: string[] = [];
let adapterDangMo: SqliteDatabaseAdapter | null = null;

afterEach(async () => {
  vi.useRealTimers();
  giu.traLoi = [];
  delete process.env.VAULT_ENCRYPTION_KEY;
  adapterDangMo?.close();
  adapterDangMo = null;
  await Promise.all(thuMuc.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function dung(): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "antigravity-vietho-"));
  thuMuc.push(root);
  const adapter = new SqliteDatabaseAdapter(path.join(root, "test.db"));
  adapterDangMo = adapter;
  migrate(adapter.db, { migrationsFolder: path.resolve("drizzle") });
  giu.adapter = adapter;
  // Bảng job ghi thời gian theo GIÂY — hai lượt viết trong cùng một giây thì
  // không phân được cái nào mới hơn. Đồng hồ giả, mỗi lượt cách nhau 2 giây.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-12T03:00:00Z"));
  const khoa = Buffer.alloc(32, 3).toString("hex");
  process.env.VAULT_ENCRYPTION_KEY = khoa;
  giu.vault = new Vault(khoa);
  const now = new Date();
  adapter.db.insert(workspaces).values({ id: "ws1", name: "W", slug: "w", createdAt: now, updatedAt: now }).run();
  adapter.db
    .insert(users)
    .values({ id: "u1", email: "u@x.test", displayName: "Chủ", passwordHash: "x", status: "active", createdAt: now, updatedAt: now })
    .run();
  adapter.db.insert(workspaceMembers).values({ workspaceId: "ws1", userId: "u1", role: "editor", createdAt: now, updatedAt: now }).run();
  adapter.db
    .insert(projects)
    .values({ id: "p1", workspaceId: "ws1", name: "Hạ Long Xanh 360", website: "https://halongxanh360.vn", language: "Tiếng Việt", tone: "Chuyên nghiệp", createdAt: now, updatedAt: now })
    .run();
  await getAiKeyService().saveKey("u1", "deepseek", "sk-thu-123456", "deepseek-v4-flash");
}

async function vietHo(truong: string, giaTriHienTai: string, goiY = ""): Promise<string> {
  vi.setSystemTime(new Date(Date.now() + 2_000));
  const job = await getModuleJobService().create(CHU, "RIS_VIET_HO", {
    projectId: "p1",
    idempotencyKey: crypto.randomUUID(),
    ai: { provider: "deepseek", model: "deepseek-v4-flash" },
    truong,
    nhan: "Ô thử",
    giaTriHienTai,
    goiY,
    boiCanh: { siteName: "Hạ Long Xanh 360" },
  });
  await runModuleJobAppNative("ws1", "u1", job.id);
  const xong = await getModuleJobService().get(CHU, job.id);
  expect(xong.status).toBe("succeeded");
  return String(xong.output?.noiDung);
}

describe("AI viết hộ — lịch sử theo ô, quay về bản trước", () => {
  it("mỗi lần viết là một bản; lịch sử lọc đúng ô, mới nhất trước, kèm bản trước khi AI đè", async () => {
    await dung();
    giu.traLoi = ["Bản AI lần 1", "Bản AI lần 2", "Bản của ô khác"];

    expect(await vietHo("audienceBrief", "Bản người gõ tay")).toBe("Bản AI lần 1");
    expect(await vietHo("audienceBrief", "Bản AI lần 1 đã sửa tay", "ngắn hơn")).toBe("Bản AI lần 2");
    expect(await vietHo("chuDe", "")).toBe("Bản của ô khác");

    const ls = await lichSuVietHo(CHU, "p1", "audienceBrief");
    expect(ls.map((b) => b.noiDung)).toEqual(["Bản AI lần 2", "Bản AI lần 1"]);
    expect(ls[0]).toMatchObject({ banTruoc: "Bản AI lần 1 đã sửa tay", goiY: "ngắn hơn", provider: "deepseek", model: "deepseek-v4-flash" });
    expect(ls[1]).toMatchObject({ banTruoc: "Bản người gõ tay", goiY: "" });

    expect((await lichSuVietHo(CHU, "p1", "chuDe")).map((b) => b.noiDung)).toEqual(["Bản của ô khác"]);
    expect(await lichSuVietHo(CHU, "p1", "khong-co")).toEqual([]);
  });

  it("module ẩn vẫn chạy được qua cổng job, và dùng khoá AI của đúng người dùng", async () => {
    await dung();
    // Người không có khoá → job hỏng với mã rõ, không gọi AI.
    const job = await getModuleJobService().create(CHU, "RIS_VIET_HO", {
      projectId: "p1",
      idempotencyKey: crypto.randomUUID(),
      ai: { provider: "openai", model: "gpt-5-mini" },
      truong: "x",
      nhan: "y",
    });
    await runModuleJobAppNative("ws1", "u1", job.id);
    const xong = await getModuleJobService().get(CHU, job.id);
    expect(xong.status).toBe("failed");
    expect(xong.errorCode).toBe("AI_USER_KEY_MISSING");
    // Bản hỏng không vào lịch sử.
    expect(await lichSuVietHo(CHU, "p1", "x")).toEqual([]);
  });

  it("dự án của workspace khác không đọc được lịch sử", async () => {
    await dung();
    await expect(lichSuVietHo({ ...CHU, workspaceId: "ws9" }, "p1", "audienceBrief")).rejects.toThrow();
  });
});

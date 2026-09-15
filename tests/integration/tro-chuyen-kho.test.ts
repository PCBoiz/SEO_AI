import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, expect, it } from "vitest";
import type { TinNhanRecord } from "@/domain/tro-chuyen/kho";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";
import { SqliteTroChuyenRepository } from "@/infrastructure/tro-chuyen/sqlite-tro-chuyen-repository";
import { projects, users, workspaces } from "@/lib/db/schema";

describe("SqliteTroChuyenRepository — bảng thật sau migration", () => {
  it("riêng từng người, thứ tự tin theo mili-giây, cắt N tin mới nhất, xoá kèm tin", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "antigravity-tro-chuyen-"));
    const adapter = new SqliteDatabaseAdapter(path.join(root, "test.db"));
    try {
      migrate(adapter.db, { migrationsFolder: path.resolve("drizzle") });
      const now = new Date("2026-09-15T00:00:00Z");
      const t0 = now.getTime();
      adapter.db.insert(workspaces).values({ id: "ws1", name: "W", slug: "w", createdAt: now, updatedAt: now }).run();
      for (const u of ["u1", "u2"]) {
        adapter.db
          .insert(users)
          .values({ id: u, email: `${u}@x.test`, displayName: u, passwordHash: "x", status: "active", createdAt: now, updatedAt: now })
          .run();
      }
      adapter.db
        .insert(projects)
        .values({
          id: "p1",
          workspaceId: "ws1",
          name: "Minh Anh Land (tên giả)",
          website: "https://minh-anh.example",
          language: "Tiếng Việt",
          tone: "Điềm đạm",
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const kho = new SqliteTroChuyenRepository(adapter.db);
      await kho.tao({ id: "c1", workspaceId: "ws1", userId: "u1", projectId: "p1", tieuDe: "A", createdAt: new Date(t0), updatedAt: new Date(t0) });
      await kho.tao({ id: "c2", workspaceId: "ws1", userId: "u1", projectId: null, tieuDe: "B", createdAt: new Date(t0 + 5), updatedAt: new Date(t0 + 5) });
      await kho.tao({ id: "c3", workspaceId: "ws1", userId: "u2", projectId: null, tieuDe: "C", createdAt: new Date(t0), updatedAt: new Date(t0) });

      expect((await kho.lietKe("ws1", "u1", 10)).map((c) => c.id)).toEqual(["c2", "c1"]);
      expect(await kho.lay("ws1", "u2", "c1")).toBeNull();
      // Lưu mili-giây: createdAt đọc lại đúng từng ms.
      expect((await kho.lay("ws1", "u1", "c2"))?.createdAt.getTime()).toBe(t0 + 5);

      const tin = (id: string, vai: TinNhanRecord["vai"], ms: number): TinNhanRecord => ({
        id,
        troChuyenId: "c1",
        vai,
        noiDung: id,
        provider: null,
        model: null,
        inputTokens: null,
        outputTokens: null,
        durationMs: null,
        createdAt: new Date(t0 + ms),
      });
      // Ghi lộn thứ tự, cách nhau 1 ms.
      await kho.themTin(tin("t2", "tro-ly", 11));
      await kho.themTin(tin("t1", "nguoi-dung", 10));
      await kho.themTin(tin("t3", "nguoi-dung", 12));
      expect((await kho.lietKeTin("c1", 10)).map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
      expect((await kho.lietKeTin("c1", 2)).map((t) => t.id)).toEqual(["t2", "t3"]);

      await kho.capNhat("ws1", "u1", "c1", { tieuDe: "Mới", updatedAt: new Date(t0 + 100) });
      expect((await kho.lietKe("ws1", "u1", 10)).map((c) => `${c.id}:${c.tieuDe}`)).toEqual(["c1:Mới", "c2:B"]);
      // Người khác sửa không ăn.
      await kho.capNhat("ws1", "u2", "c1", { tieuDe: "Bị sửa", updatedAt: new Date(t0 + 200) });
      expect((await kho.lay("ws1", "u1", "c1"))?.tieuDe).toBe("Mới");

      expect(await kho.xoa("ws1", "u2", "c1")).toBe(false);
      expect(await kho.xoa("ws1", "u1", "c1")).toBe(true);
      expect(await kho.lietKeTin("c1", 10)).toEqual([]);
      expect((await kho.lietKe("ws1", "u1", 10)).map((c) => c.id)).toEqual(["c2"]);
    } finally {
      adapter.close();
      await rm(root, { recursive: true, force: true });
    }
  });
});

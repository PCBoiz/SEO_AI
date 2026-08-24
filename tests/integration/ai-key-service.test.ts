import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it } from "vitest";
import { AiKeyService } from "@/application/ai/ai-key-service";
import { SqliteAiKeyRepository } from "@/infrastructure/ai/sqlite-ai-key-repository";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";
import { Vault } from "@/lib/vault";
import { users } from "@/lib/db/schema";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), "antigravity-ai-key-"));
  temporaryDirectories.push(root);
  const adapter = new SqliteDatabaseAdapter(path.join(root, "test.db"));
  migrate(adapter.db, { migrationsFolder: path.resolve("drizzle") });
  const now = new Date();
  adapter.db
    .insert(users)
    .values({
      id: "user-1",
      email: "u@example.com",
      displayName: "User",
      passwordHash: "hash",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  const service = new AiKeyService(
    new SqliteAiKeyRepository(adapter.db),
    new Vault(randomBytes(32).toString("hex")),
  );
  return { adapter, service };
}

describe("AiKeyService (BYOK per-user)", () => {
  it("lưu key mã hoá, list chỉ trả trạng thái, giải mã lại đúng key", async () => {
    const { adapter, service } = await setup();
    try {
      const view = await service.saveKey(
        "user-1",
        "deepseek",
        "sk-secret-123456",
      );
      expect(view).toMatchObject({
        provider: "deepseek",
        configured: true,
        status: "unverified",
      });
      expect(view.keyHint).toBe("••••3456");
      expect(JSON.stringify(view)).not.toContain("sk-secret-123456");

      const list = await service.listStatus("user-1");
      expect(list).toHaveLength(1);
      expect(JSON.stringify(list)).not.toContain("sk-secret-123456");

      expect(await service.getDecryptedKey("user-1", "deepseek")).toBe(
        "sk-secret-123456",
      );
    } finally {
      adapter.close();
    }
  });

  it("ghi đè key cùng provider sẽ reset trạng thái verified và xoá được", async () => {
    const { adapter, service } = await setup();
    try {
      await service.saveKey("user-1", "openai", "sk-openai-aaaa1111");
      await service.markStatus("user-1", "openai", "active", true);
      await service.saveKey("user-1", "openai", "sk-openai-bbbb2222");

      const list = await service.listStatus("user-1");
      expect(list).toHaveLength(1);
      expect(list[0].status).toBe("unverified");
      expect(await service.getDecryptedKey("user-1", "openai")).toBe(
        "sk-openai-bbbb2222",
      );

      expect(await service.deleteKey("user-1", "openai")).toBe(true);
      expect(await service.getDecryptedKey("user-1", "openai")).toBeNull();
    } finally {
      adapter.close();
    }
  });

  it("lưu model do user chọn và trả lại qua status + getUsableKey", async () => {
    const { adapter, service } = await setup();
    try {
      const view = await service.saveKey(
        "user-1",
        "gemini",
        "AIza-user-key-123",
        "gemini-3.6-pro",
      );
      expect(view.model).toBe("gemini-3.6-pro");
      const usable = await service.getUsableKey("user-1", "gemini");
      expect(usable).toEqual({
        apiKey: "AIza-user-key-123",
        model: "gemini-3.6-pro",
      });
    } finally {
      adapter.close();
    }
  });

  it("từ chối key rỗng/placeholder và provider lạ", async () => {
    const { adapter, service } = await setup();
    try {
      await expect(service.saveKey("user-1", "deepseek", "")).rejects.toThrow();
      await expect(
        service.saveKey("user-1", "deepseek", "<your-key>"),
      ).rejects.toThrow();
      await expect(
        service.saveKey("user-1", "khong-ton-tai", "sk-xxxxxxxx"),
      ).rejects.toThrow();
    } finally {
      adapter.close();
    }
  });
});

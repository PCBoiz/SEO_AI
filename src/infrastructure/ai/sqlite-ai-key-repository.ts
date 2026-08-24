import { and, eq } from "drizzle-orm";
import type { AiProviderId } from "@/domain/ai/ai-model-provider";
import type {
  AiKeyRecord,
  AiKeyRepository,
  AiKeyStatus,
  UpsertAiKeyRecord,
} from "@/domain/ai/ai-key";
import type { ApplicationDatabase } from "@/infrastructure/database/sqlite-adapter";
import { userAiKeys } from "@/lib/db/schema";

export class SqliteAiKeyRepository implements AiKeyRepository {
  constructor(private readonly database: ApplicationDatabase) {}

  async upsert(record: UpsertAiKeyRecord): Promise<AiKeyRecord> {
    this.database
      .insert(userAiKeys)
      .values({
        id: record.id,
        userId: record.userId,
        provider: record.provider,
        encryptedKey: record.encryptedKey,
        keyHint: record.keyHint,
        model: record.model,
        status: "unverified",
        createdAt: record.now,
        updatedAt: record.now,
      })
      .onConflictDoUpdate({
        target: [userAiKeys.userId, userAiKeys.provider],
        set: {
          encryptedKey: record.encryptedKey,
          keyHint: record.keyHint,
          model: record.model,
          status: "unverified",
          lastVerifiedAt: null,
          updatedAt: record.now,
        },
      })
      .run();
    const saved = await this.getByUserAndProvider(
      record.userId,
      record.provider,
    );
    if (!saved) {
      throw new Error("Không thể đọc lại AI key sau khi lưu.");
    }
    return saved;
  }

  async getByUserAndProvider(
    userId: string,
    provider: AiProviderId,
  ): Promise<AiKeyRecord | null> {
    const rows = await this.database
      .select()
      .from(userAiKeys)
      .where(
        and(eq(userAiKeys.userId, userId), eq(userAiKeys.provider, provider)),
      )
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async listByUser(userId: string): Promise<AiKeyRecord[]> {
    const rows = await this.database
      .select()
      .from(userAiKeys)
      .where(eq(userAiKeys.userId, userId));
    return rows.map(mapRow);
  }

  async deleteByUserAndProvider(
    userId: string,
    provider: AiProviderId,
  ): Promise<boolean> {
    const result = this.database
      .delete(userAiKeys)
      .where(
        and(eq(userAiKeys.userId, userId), eq(userAiKeys.provider, provider)),
      )
      .run();
    return result.changes > 0;
  }

  async updateStatus(
    userId: string,
    provider: AiProviderId,
    status: AiKeyStatus,
    lastVerifiedAt: Date | null,
    now: Date,
    model?: string | null,
  ): Promise<void> {
    this.database
      .update(userAiKeys)
      .set({
        status,
        lastVerifiedAt,
        updatedAt: now,
        ...(model !== undefined ? { model } : {}),
      })
      .where(
        and(eq(userAiKeys.userId, userId), eq(userAiKeys.provider, provider)),
      )
      .run();
  }
}

function mapRow(row: typeof userAiKeys.$inferSelect): AiKeyRecord {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider,
    encryptedKey: row.encryptedKey,
    keyHint: row.keyHint,
    model: row.model,
    status: row.status,
    lastVerifiedAt: row.lastVerifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

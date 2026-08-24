import { and, eq } from "drizzle-orm";
import type { AiProviderId } from "@/domain/ai/ai-model-provider";
import type {
  AiKeyRecord,
  AiKeyRepository,
  AiKeyStatus,
  UpsertAiKeyRecord,
} from "@/domain/ai/ai-key";
import type { NeonApplicationDatabase } from "@/infrastructure/database/neon-adapter";
import { pgUserAiKeys } from "@/lib/db/postgres-schema";

export class NeonAiKeyRepository implements AiKeyRepository {
  constructor(private readonly database: NeonApplicationDatabase) {}

  async upsert(record: UpsertAiKeyRecord): Promise<AiKeyRecord> {
    const rows = await this.database
      .insert(pgUserAiKeys)
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
        target: [pgUserAiKeys.userId, pgUserAiKeys.provider],
        set: {
          encryptedKey: record.encryptedKey,
          keyHint: record.keyHint,
          model: record.model,
          status: "unverified",
          lastVerifiedAt: null,
          updatedAt: record.now,
        },
      })
      .returning();
    const saved = rows[0];
    if (!saved) {
      throw new Error("Không thể đọc lại AI key sau khi lưu trên Neon.");
    }
    return mapRow(saved);
  }

  async getByUserAndProvider(
    userId: string,
    provider: AiProviderId,
  ): Promise<AiKeyRecord | null> {
    const rows = await this.database
      .select()
      .from(pgUserAiKeys)
      .where(
        and(
          eq(pgUserAiKeys.userId, userId),
          eq(pgUserAiKeys.provider, provider),
        ),
      )
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async listByUser(userId: string): Promise<AiKeyRecord[]> {
    const rows = await this.database
      .select()
      .from(pgUserAiKeys)
      .where(eq(pgUserAiKeys.userId, userId));
    return rows.map(mapRow);
  }

  async deleteByUserAndProvider(
    userId: string,
    provider: AiProviderId,
  ): Promise<boolean> {
    const rows = await this.database
      .delete(pgUserAiKeys)
      .where(
        and(
          eq(pgUserAiKeys.userId, userId),
          eq(pgUserAiKeys.provider, provider),
        ),
      )
      .returning({ id: pgUserAiKeys.id });
    return rows.length > 0;
  }

  async updateStatus(
    userId: string,
    provider: AiProviderId,
    status: AiKeyStatus,
    lastVerifiedAt: Date | null,
    now: Date,
    model?: string | null,
  ): Promise<void> {
    await this.database
      .update(pgUserAiKeys)
      .set({
        status,
        lastVerifiedAt,
        updatedAt: now,
        ...(model !== undefined ? { model } : {}),
      })
      .where(
        and(
          eq(pgUserAiKeys.userId, userId),
          eq(pgUserAiKeys.provider, provider),
        ),
      );
  }
}

function mapRow(row: typeof pgUserAiKeys.$inferSelect): AiKeyRecord {
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

import type { AiProviderId } from "@/domain/ai/ai-model-provider";

export const aiKeyStatuses = ["unverified", "active", "error"] as const;
export type AiKeyStatus = (typeof aiKeyStatuses)[number];

export interface AiKeyRecord {
  id: string;
  userId: string;
  provider: AiProviderId;
  encryptedKey: string;
  keyHint: string | null;
  model: string | null;
  status: AiKeyStatus;
  lastVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertAiKeyRecord {
  id: string;
  userId: string;
  provider: AiProviderId;
  encryptedKey: string;
  keyHint: string | null;
  model: string | null;
  now: Date;
}

// Chỉ những trường an toàn để gửi về client. KHÔNG bao giờ chứa key hay ciphertext.
export interface AiKeyStatusView {
  provider: AiProviderId;
  configured: boolean;
  status: AiKeyStatus;
  keyHint: string | null;
  model: string | null;
  lastVerifiedAt: string | null;
  updatedAt: string | null;
}

export interface AiKeyRepository {
  upsert(record: UpsertAiKeyRecord): Promise<AiKeyRecord>;
  getByUserAndProvider(
    userId: string,
    provider: AiProviderId,
  ): Promise<AiKeyRecord | null>;
  listByUser(userId: string): Promise<AiKeyRecord[]>;
  deleteByUserAndProvider(
    userId: string,
    provider: AiProviderId,
  ): Promise<boolean>;
  updateStatus(
    userId: string,
    provider: AiProviderId,
    status: AiKeyStatus,
    lastVerifiedAt: Date | null,
    now: Date,
    model?: string | null,
  ): Promise<void>;
}

export function computeKeyHint(rawKey: string): string {
  const trimmed = rawKey.trim();
  const last4 = trimmed.length >= 4 ? trimmed.slice(-4) : trimmed;
  return `••••${last4}`;
}

export function toAiKeyStatusView(record: AiKeyRecord): AiKeyStatusView {
  return {
    provider: record.provider,
    configured: true,
    status: record.status,
    keyHint: record.keyHint,
    model: record.model,
    lastVerifiedAt: record.lastVerifiedAt
      ? record.lastVerifiedAt.toISOString()
      : null,
    updatedAt: record.updatedAt ? record.updatedAt.toISOString() : null,
  };
}

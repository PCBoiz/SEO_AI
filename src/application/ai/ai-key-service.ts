import { randomUUID } from "node:crypto";
import { aiProviderIds, type AiProviderId } from "@/domain/ai/ai-model-provider";
import {
  computeKeyHint,
  toAiKeyStatusView,
  type AiKeyRepository,
  type AiKeyStatus,
  type AiKeyStatusView,
} from "@/domain/ai/ai-key";
import { ValidationError } from "@/domain/shared/app-error";
import type { Vault } from "@/lib/vault";

// AAD ràng ciphertext với đúng user + provider: một bản mã của user này không thể
// bị dùng lại cho user/provider khác dù có cùng khóa Vault.
function keyAad(userId: string, provider: AiProviderId): string {
  return `ai-key/v1/${userId}/${provider}`;
}

function assertProvider(provider: string): asserts provider is AiProviderId {
  if (!(aiProviderIds as readonly string[]).includes(provider)) {
    throw new ValidationError(
      "AI_PROVIDER_UNKNOWN",
      "AI provider không được hỗ trợ.",
      { provider },
    );
  }
}

export class AiKeyService {
  constructor(
    private readonly repository: AiKeyRepository,
    private readonly vault: Vault,
  ) {}

  async saveKey(
    userId: string,
    provider: string,
    rawKey: string,
    model?: string,
  ): Promise<AiKeyStatusView> {
    assertProvider(provider);
    const key = rawKey.trim();
    if (!key || /^<.*>$/.test(key) || key.length < 8) {
      throw new ValidationError("AI_KEY_INVALID", "API key không hợp lệ.", {
        provider,
      });
    }
    const modelValue = model?.trim() ? model.trim() : null;
    if (modelValue && modelValue.length > 120) {
      throw new ValidationError("AI_MODEL_INVALID", "Tên model quá dài.", {
        provider,
      });
    }
    const now = new Date();
    const record = await this.repository.upsert({
      id: randomUUID(),
      userId,
      provider,
      encryptedKey: this.vault.encrypt(key, keyAad(userId, provider)),
      keyHint: computeKeyHint(key),
      model: modelValue,
      now,
    });
    return toAiKeyStatusView(record);
  }

  async listStatus(userId: string): Promise<AiKeyStatusView[]> {
    const records = await this.repository.listByUser(userId);
    return records.map(toAiKeyStatusView);
  }

  async deleteKey(userId: string, provider: string): Promise<boolean> {
    assertProvider(provider);
    return this.repository.deleteByUserAndProvider(userId, provider);
  }

  // Chỉ dùng phía server (verify key + chạy Module 1 app-native). KHÔNG expose qua API.
  async getDecryptedKey(
    userId: string,
    provider: AiProviderId,
  ): Promise<string | null> {
    const record = await this.repository.getByUserAndProvider(userId, provider);
    if (!record) return null;
    return this.vault.decrypt(record.encryptedKey, keyAad(userId, provider));
  }

  // Trả key đã giải mã kèm model do user chọn (null nếu user chưa chọn model
  // riêng — caller sẽ fallback về model mặc định của provider).
  async getUsableKey(
    userId: string,
    provider: AiProviderId,
  ): Promise<{ apiKey: string; model: string | null } | null> {
    const record = await this.repository.getByUserAndProvider(userId, provider);
    if (!record) return null;
    return {
      apiKey: this.vault.decrypt(record.encryptedKey, keyAad(userId, provider)),
      model: record.model,
    };
  }

  async markStatus(
    userId: string,
    provider: AiProviderId,
    status: AiKeyStatus,
    verified: boolean,
    model?: string,
  ): Promise<void> {
    await this.repository.updateStatus(
      userId,
      provider,
      status,
      verified ? new Date() : null,
      new Date(),
      model,
    );
  }
}

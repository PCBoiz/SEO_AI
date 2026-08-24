import "server-only";

import { AiKeyService } from "@/application/ai/ai-key-service";
import type { AiProviderId } from "@/domain/ai/ai-model-provider";
import { ValidationError } from "@/domain/shared/app-error";
import { AiProviderError } from "@/infrastructure/ai/ai-provider-error";
import { NeonAiKeyRepository } from "@/infrastructure/ai/neon-ai-key-repository";
import { SqliteAiKeyRepository } from "@/infrastructure/ai/sqlite-ai-key-repository";
import {
  getUserAiModelProvider,
  listAiProviderStatuses,
} from "@/lib/ai/ai-provider-registry.server";
import { databaseAdapter } from "@/lib/db";
import { Vault } from "@/lib/vault";

export function getAiKeyService(): AiKeyService {
  const repository =
    databaseAdapter.kind === "neon"
      ? new NeonAiKeyRepository(databaseAdapter.db)
      : new SqliteAiKeyRepository(databaseAdapter.db);
  return new AiKeyService(repository, getVault());
}

// Xác minh key bằng một lần gọi model rất nhỏ (16 token) với chính key của user.
// Không echo lỗi thô của provider để tránh rò rỉ; chỉ cập nhật trạng thái active/error.
export async function verifyUserAiKey(
  userId: string,
  provider: AiProviderId,
  modelOverride?: string,
): Promise<{ verified: boolean; message?: string; model?: string }> {
  const service = getAiKeyService();
  const usable = await service.getUsableKey(userId, provider);
  if (!usable) {
    return { verified: false, message: "Chưa có key cho provider này." };
  }
  const apiKey = usable.apiKey;
  // Ưu tiên model đang chọn trên UI, rồi model đã lưu, cuối cùng model mặc định.
  const model =
    modelOverride?.trim() ||
    usable.model?.trim() ||
    listAiProviderStatuses().find((status) => status.id === provider)?.model ||
    "";
  try {
    // 256 token: đủ chỗ cho model bật thinking (Gemini 3.x) vẫn trả được text.
    const adapter = getUserAiModelProvider({
      provider,
      model,
      apiKey,
      maxOutputTokens: 256,
    });
    await adapter.generate({
      prompt: "Trả lời đúng một từ: OK",
      maxOutputTokens: 256,
    });
    // Xác minh thành công thì ghi nhớ đúng model vừa test.
    await service.markStatus(userId, provider, "active", true, model);
    return { verified: true, model };
  } catch (error) {
    await service.markStatus(userId, provider, "error", false);
    return { verified: false, message: describeVerifyError(error, model) };
  }
}

// Diễn giải lỗi verify thành thông báo hữu ích nhưng an toàn: chỉ dùng mã lỗi và
// HTTP status (không chứa API key), giúp owner biết là sai KEY hay sai MODEL.
function describeVerifyError(error: unknown, model: string): string {
  if (error instanceof AiProviderError) {
    const status =
      typeof error.details?.status === "number"
        ? error.details.status
        : undefined;
    // Thông điệp lỗi gốc từ provider (đã cắt ngắn, không chứa key) — manh mối
    // chính xác nhất để phân biệt sai model / hết quota / key thiếu quyền.
    const detail =
      typeof error.details?.detail === "string"
        ? ` Provider báo: "${error.details.detail}"`
        : "";
    if (error.code === "AI_PROVIDER_REJECTED") {
      // Nhận diện lỗi billing/credit: key + model ĐÚNG, tài khoản chỉ cần nạp tiền.
      if (
        typeof error.details?.detail === "string" &&
        /credit balance|billing|purchase credits|insufficient.*(funds|balance|quota)/i.test(
          error.details.detail,
        )
      ) {
        return `Key và model hợp lệ — tài khoản provider hết credit/chưa nạp tiền.${detail}`;
      }
      if (status === 401 || status === 403) {
        return `Provider từ chối API key (HTTP ${status}) — key sai, hết hạn hoặc không đủ quyền.${detail}`;
      }
      if (status === 404) {
        return `Không tìm thấy model "${model}" (HTTP 404) — key không có quyền dùng model này.${detail}`;
      }
      if (status === 400) {
        return `Yêu cầu không hợp lệ (HTTP 400) — thường do tên model "${model}" sai.${detail}`;
      }
      if (status === 429) {
        return `Bị giới hạn tần suất hoặc hết quota (HTTP 429).${detail}`;
      }
      return `Provider từ chối yêu cầu (HTTP ${status ?? "?"}).${detail}`;
    }
    if (error.code === "AI_PROVIDER_EMPTY_RESPONSE") {
      return "Key hợp lệ nhưng model trả về rỗng khi gọi thử.";
    }
    if (error.code === "AI_PROVIDER_UNREACHABLE") {
      return "Không kết nối được tới provider (mạng/timeout).";
    }
    if (error.code === "AI_PROVIDER_INVALID_RESPONSE") {
      return `Provider trả dữ liệu không như mong đợi — thường do model "${model}" sai. Thử model khác hoặc tự nhập ID chính xác.`;
    }
  }
  return `Gọi thử thất bại — có thể tên model "${model}" sai hoặc key không hợp lệ. Thử model khác hoặc tự nhập ID chính xác từ tài khoản của bạn.`;
}

function getVault(): Vault {
  const key = process.env.VAULT_ENCRYPTION_KEY?.trim();
  if (!key) {
    throw new ValidationError(
      "VAULT_NOT_CONFIGURED",
      "Vault chưa được cấu hình để lưu API key AI.",
    );
  }
  return new Vault(key);
}

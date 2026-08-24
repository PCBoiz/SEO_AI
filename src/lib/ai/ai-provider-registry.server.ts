import "server-only";

import type {
  AiModelProvider,
  AiProviderId,
  AiProviderStatus,
} from "@/domain/ai/ai-model-provider";
import {
  buildUserAiProviderConfiguration,
  getAiProviderStatuses,
} from "@/infrastructure/config/ai-environment";
import {
  AnthropicModelProvider,
  DeepSeekModelProvider,
  GeminiModelProvider,
  OpenAiModelProvider,
} from "@/infrastructure/ai/live-ai-model-providers";

export function listAiProviderStatuses(): AiProviderStatus[] {
  return getAiProviderStatuses();
}

// Không còn adapter chạy bằng key phía server: mọi lời gọi model đều đi qua
// getUserAiModelProvider với key BYOK của chính người dùng.

// BYOK: dựng adapter live từ API key của người dùng (đã giải mã server-side).
export function getUserAiModelProvider(options: {
  provider: AiProviderId;
  model: string;
  apiKey: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
}): AiModelProvider {
  const configuration = buildUserAiProviderConfiguration(options);
  switch (options.provider) {
    case "openai":
      return new OpenAiModelProvider(configuration);
    case "deepseek":
      return new DeepSeekModelProvider(configuration);
    case "gemini":
      return new GeminiModelProvider(configuration);
    case "anthropic":
      return new AnthropicModelProvider(configuration);
  }
}

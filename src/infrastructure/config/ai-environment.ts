import { z } from "zod";
import type {
  AiExecutionMode,
  AiProviderId,
  AiProviderStatus,
} from "@/domain/ai/ai-model-provider";
import { ConfigurationError } from "@/domain/shared/app-error";

const environmentSchema = z.object({
  AI_EXECUTION_MODE: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.enum(["mock", "live"]).default("mock"),
  ),
  AI_LIVE_PROVIDERS: z.string().optional(),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(64).max(4_096).default(1_024),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-5.6-terra"),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_MODEL: z.string().trim().min(1).default("deepseek-v4-flash"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-3.6-flash"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().trim().min(1).default("claude-sonnet-5"),
});

export interface AiProviderConfiguration {
  id: AiProviderId;
  label: string;
  model: string;
  mode: AiExecutionMode;
  apiKey?: string;
  timeoutMs: number;
  maxOutputTokens: number;
}

type ApiKeyField =
  | "OPENAI_API_KEY"
  | "DEEPSEEK_API_KEY"
  | "GEMINI_API_KEY"
  | "ANTHROPIC_API_KEY";
type ModelField =
  | "OPENAI_MODEL"
  | "DEEPSEEK_MODEL"
  | "GEMINI_MODEL"
  | "ANTHROPIC_MODEL";

const providerMetadata: Record<
  AiProviderId,
  { label: string; keyField: ApiKeyField; modelField: ModelField }
> = {
  openai: {
    label: "OpenAI",
    keyField: "OPENAI_API_KEY",
    modelField: "OPENAI_MODEL",
  },
  deepseek: {
    label: "DeepSeek",
    keyField: "DEEPSEEK_API_KEY",
    modelField: "DEEPSEEK_MODEL",
  },
  gemini: {
    label: "Google Gemini",
    keyField: "GEMINI_API_KEY",
    modelField: "GEMINI_MODEL",
  },
  anthropic: {
    label: "Anthropic Claude",
    keyField: "ANTHROPIC_API_KEY",
    modelField: "ANTHROPIC_MODEL",
  },
};

export function getAiProviderConfiguration(
  provider: AiProviderId,
  source: Record<string, string | undefined> = process.env,
): AiProviderConfiguration {
  const environment = parseEnvironment(source);
  const metadata = providerMetadata[provider];
  const liveProviders = parseLiveProviders(environment.AI_LIVE_PROVIDERS);
  const mode: AiExecutionMode =
    environment.AI_EXECUTION_MODE === "live" && liveProviders.includes(provider)
      ? "live"
      : "mock";
  const apiKey = normalizedSecret(environment[metadata.keyField] as string | undefined);
  if (mode === "live" && !apiKey) {
    throw new ConfigurationError(
      "AI_PROVIDER_NOT_CONFIGURED",
      `${String(metadata.keyField)} chưa được cấu hình ở server.`,
      { provider, field: metadata.keyField },
    );
  }
  return {
    id: provider,
    label: metadata.label,
    model: String(environment[metadata.modelField]),
    mode,
    apiKey,
    timeoutMs: environment.AI_REQUEST_TIMEOUT_MS,
    maxOutputTokens: environment.AI_MAX_OUTPUT_TOKENS,
  };
}

// BYOK: dựng cấu hình provider từ API key do người dùng cung cấp (đã giải mã
// server-side), không phụ thuộc key ở env. Dùng cho verify key và chạy Module 1
// app-native. Key không bao giờ rời server.
export function buildUserAiProviderConfiguration(options: {
  provider: AiProviderId;
  model: string;
  apiKey: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
}): AiProviderConfiguration {
  const apiKey = normalizedSecret(options.apiKey);
  if (!apiKey) {
    throw new ConfigurationError(
      "AI_USER_KEY_MISSING",
      "Thiếu API key do người dùng cung cấp.",
      { provider: options.provider },
    );
  }
  const model = options.model.trim();
  if (!model) {
    throw new ConfigurationError(
      "AI_MODEL_MISSING",
      "Thiếu model cho lần gọi AI.",
      { provider: options.provider },
    );
  }
  return {
    id: options.provider,
    label: providerMetadata[options.provider].label,
    model,
    mode: "live",
    apiKey,
    timeoutMs: options.timeoutMs ?? 30_000,
    maxOutputTokens: options.maxOutputTokens ?? 1_024,
  };
}

export function getAiProviderStatuses(
  source: Record<string, string | undefined> = process.env,
): AiProviderStatus[] {
  const environment = parseEnvironment(source);
  const liveProviders = parseLiveProviders(environment.AI_LIVE_PROVIDERS);
  return (Object.keys(providerMetadata) as AiProviderId[]).map((id) => {
    const metadata = providerMetadata[id];
    const credentialsConfigured = Boolean(
      normalizedSecret(environment[metadata.keyField] as string | undefined),
    );
    const mode: AiExecutionMode =
      environment.AI_EXECUTION_MODE === "live" && liveProviders.includes(id)
        ? "live"
        : "mock";
    return {
      id,
      label: metadata.label,
      model: String(environment[metadata.modelField]),
      mode,
      credentialsConfigured,
      available:
        mode === "mock" || credentialsConfigured,
    };
  });
}

function parseEnvironment(source: Record<string, string | undefined>) {
  const result = environmentSchema.safeParse(source);
  if (!result.success) {
    throw new ConfigurationError(
      "INVALID_AI_ENVIRONMENT",
      "Cấu hình AI provider không hợp lệ.",
      { fields: result.error.issues.map((issue) => issue.path.join(".")) },
    );
  }
  if (
    result.data.AI_EXECUTION_MODE === "live" &&
    parseLiveProviders(result.data.AI_LIVE_PROVIDERS).length === 0
  ) {
    throw new ConfigurationError(
      "AI_LIVE_PROVIDER_ALLOWLIST_REQUIRED",
      "AI_LIVE_PROVIDERS phải chỉ rõ provider được phép gọi thật.",
      { fields: ["AI_LIVE_PROVIDERS"] },
    );
  }
  return result.data;
}

function parseLiveProviders(value: string | undefined): AiProviderId[] {
  const allowed = new Set<AiProviderId>(Object.keys(providerMetadata) as AiProviderId[]);
  const parsed = Array.from(
    new Set(
      (value ?? "")
        .split(/[\s,]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  const invalid = parsed.filter((item) => !allowed.has(item as AiProviderId));
  if (invalid.length > 0) {
    throw new ConfigurationError(
      "INVALID_AI_LIVE_PROVIDER_ALLOWLIST",
      "AI_LIVE_PROVIDERS chứa provider không được hỗ trợ.",
      { fields: ["AI_LIVE_PROVIDERS"], invalid },
    );
  }
  return parsed as AiProviderId[];
}

function normalizedSecret(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && !/^<.*>$/.test(trimmed) ? trimmed : undefined;
}

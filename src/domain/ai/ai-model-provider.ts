export const aiProviderIds = [
  "openai",
  "deepseek",
  "gemini",
  "anthropic",
] as const;

export type AiProviderId = (typeof aiProviderIds)[number];
export type AiExecutionMode = "mock" | "live";

export interface AiGenerateRequest {
  prompt: string;
  systemPrompt?: string;
  maxOutputTokens: number;
}

export interface AiTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface AiGenerateResult {
  provider: AiProviderId;
  model: string;
  mode: AiExecutionMode;
  text: string;
  usage: AiTokenUsage;
  durationMs: number;
  providerRequestId?: string;
}

export interface AiModelProvider {
  readonly id: AiProviderId;
  readonly model: string;
  readonly mode: AiExecutionMode;
  generate(request: AiGenerateRequest): Promise<AiGenerateResult>;
}

export interface AiProviderStatus {
  id: AiProviderId;
  label: string;
  model: string;
  mode: AiExecutionMode;
  credentialsConfigured: boolean;
  available: boolean;
}

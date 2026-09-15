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
  /**
   * Hội thoại NHIỀU LƯỢT (màn Trò chuyện). Có thì cả bốn nhà cung cấp gửi đúng
   * dạng nhiều lượt và bỏ qua `prompt`. Lượt đầu phải là "user" và không có hai
   * lượt liền nhau cùng vai — `catLichSu` (domain/tro-chuyen) lo việc đó.
   */
  messages?: ReadonlyArray<AiChatMessage>;
}

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
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

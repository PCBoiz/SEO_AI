import type { AiProviderId } from "@/domain/ai/ai-model-provider";

export type AiModelCostTier = 1 | 2 | 3 | 4;
export type AiModelSpeed = "fast" | "balanced" | "deep";

export interface AiModelOption {
  id: string;
  label: string;
  cost: AiModelCostTier;
  speed: AiModelSpeed;
}

// Danh mục model cho mỗi provider (kiểu masterseo). Các ID dưới đây được đối
// chiếu với tài liệu chính thức của từng provider (07/2026):
// - OpenAI: developers.openai.com/api/docs/models (gpt-5.4 family 03/2026, gpt-5.5 04/2026)
// - DeepSeek: api-docs.deepseek.com — chỉ còn deepseek-v4-flash và deepseek-v4-pro
//   (deepseek-chat / deepseek-reasoner ngừng hỗ trợ 2026-07-24)
// - Gemini: ai.google.dev/gemini-api/docs — GA: gemini-3.6-flash, gemini-3.5-flash-lite;
//   Pro hiện tại: gemini-3.1-pro-preview (gemini-3-pro-preview đã shutdown 03/2026)
// - Anthropic: dùng alias chính thức, KHÔNG thêm hậu tố ngày
// Mỗi tài khoản có quyền truy cập khác nhau, nên luôn có tuỳ chọn "tự nhập".
export const aiModelCatalog: Record<AiProviderId, AiModelOption[]> = {
  openai: [
    { id: "gpt-5.4-nano", label: "GPT-5.4 Nano", cost: 1, speed: "fast" },
    { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", cost: 2, speed: "fast" },
    { id: "gpt-5.4", label: "GPT-5.4", cost: 3, speed: "balanced" },
    { id: "gpt-5.5", label: "GPT-5.5", cost: 4, speed: "deep" },
    { id: "gpt-5.2", label: "GPT-5.2", cost: 3, speed: "balanced" },
    { id: "gpt-5.1", label: "GPT-5.1", cost: 3, speed: "balanced" },
    { id: "gpt-5", label: "GPT-5", cost: 3, speed: "deep" },
    { id: "gpt-5-mini", label: "GPT-5 Mini", cost: 2, speed: "fast" },
    { id: "gpt-5-nano", label: "GPT-5 Nano", cost: 1, speed: "fast" },
    { id: "gpt-4.1", label: "GPT-4.1", cost: 3, speed: "balanced" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", cost: 2, speed: "fast" },
  ],
  deepseek: [
    {
      id: "deepseek-v4-flash",
      label: "DeepSeek V4 Flash",
      cost: 1,
      speed: "fast",
    },
    { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", cost: 3, speed: "deep" },
  ],
  gemini: [
    {
      id: "gemini-3.6-flash",
      label: "Gemini 3.6 Flash",
      cost: 1,
      speed: "fast",
    },
    {
      id: "gemini-3.5-flash-lite",
      label: "Gemini 3.5 Flash Lite",
      cost: 1,
      speed: "fast",
    },
    {
      id: "gemini-3.1-pro-preview",
      label: "Gemini 3.1 Pro (Preview)",
      cost: 3,
      speed: "deep",
    },
  ],
  anthropic: [
    {
      id: "claude-haiku-4-5",
      label: "Claude Haiku 4.5",
      cost: 1,
      speed: "fast",
    },
    {
      id: "claude-sonnet-4-6",
      label: "Claude Sonnet 4.6",
      cost: 2,
      speed: "balanced",
    },
    {
      id: "claude-sonnet-5",
      label: "Claude Sonnet 5",
      cost: 3,
      speed: "balanced",
    },
    { id: "claude-opus-4-6", label: "Claude Opus 4.6", cost: 3, speed: "deep" },
    { id: "claude-opus-4-7", label: "Claude Opus 4.7", cost: 3, speed: "deep" },
    { id: "claude-opus-4-8", label: "Claude Opus 4.8", cost: 4, speed: "deep" },
    { id: "claude-fable-5", label: "Claude Fable 5", cost: 4, speed: "deep" },
  ],
};

export function costIcon(cost: AiModelCostTier): string {
  return "💲".repeat(cost);
}

export function speedLabel(speed: AiModelSpeed): string {
  return speed === "fast"
    ? "⚡ Nhanh"
    : speed === "deep"
      ? "🧠 Sâu"
      : "⚖️ Cân bằng";
}

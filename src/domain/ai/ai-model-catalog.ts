import type { AiProviderId } from "@/domain/ai/ai-model-provider";

export type AiModelCostTier = 1 | 2 | 3 | 4;
export type AiModelSpeed = "fast" | "balanced" | "deep";

export interface AiModelOption {
  id: string;
  label: string;
  cost: AiModelCostTier;
  speed: AiModelSpeed;
}

/**
 * DANH MỤC MODEL cho mỗi nhà cung cấp — thứ màn "Khoá AI" bày ra để chọn.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TRA LẠI TÀI LIỆU CHÍNH THỨC NGÀY 20/09/2026 (chị nhắc 19/09: "đã ra các
 * models mới của cả 4 providers"). Lần tra trước là 07/2026 và đã lệch cả
 * bốn hãng. Tên model là thứ KHÔNG được đoán: sai một ký tự là mọi lượt gọi
 * trả 404 và người dùng chỉ thấy "AI chưa trả lời được".
 *
 * Nguồn (tên và giá lấy nguyên văn, giá là USD mỗi 1 triệu token vào/ra):
 * - Anthropic — platform.claude.com/docs/en/models/overview:
 *   claude-fable-5-1 ($10/$50), claude-opus-5 ($5/$25), claude-sonnet-5
 *   ($2/$10), claude-haiku-4-5 ($1/$5). Còn dùng được: claude-fable-5,
 *   claude-opus-4-8/4-7/4-6/4-5, claude-sonnet-4-6/4-5. Haiku 4.5 nghỉ hưu
 *   không sớm hơn 15/10/2026.
 * - OpenAI — developers.openai.com/api/docs/models + /deprecations:
 *   gpt-6-astra ($10/$50), gpt-5.6-sol ($4/$20, alias gpt-5.6), gpt-5.6-terra
 *   ($2/$12), gpt-5.6-luna ($0.20/$1.20). gpt-5 / gpt-5-mini / gpt-5-nano
 *   TẮT ngày 11/12/2026 (thay bằng sol/terra/luna); gpt-4.1-nano tắt
 *   23/10/2026. gpt-5.5, gpt-5.4 (mini/nano) chưa có thông báo tắt.
 * - DeepSeek — api-docs.deepseek.com/quick_start/pricing: deepseek-flash
 *   (DeepSeek-V4.1-Flash; $0.15/$0.60 giờ thấp điểm, $0.30/$1.20 giờ cao
 *   điểm), deepseek-v4-pro ($0.66/$1.98 thấp điểm). Tên cũ deepseek-v4-flash
 *   VẪN nhận nhưng model đó đã nghỉ, yêu cầu được V4.1-Flash trả lời.
 * - Gemini — ai.google.dev/gemini-api/docs/models + /pricing: GA
 *   gemini-3.8-flash, 3.7-flash, 3.6-flash (cùng $0.75/$3.75 tới hết 2026,
 *   sau đó gấp đôi), gemini-3.5-flash-lite ($0.30/$2.50), gemini-3.1-flash-lite
 *   ($0.25/$1.50), gemini-2.5-flash-lite ($0.10/$0.40); preview
 *   gemini-3.1-pro-preview ($2/$12).
 *
 * BẬC CHI PHÍ theo giá token RA (thứ đắt của một lượt sinh chữ):
 *   1: ≤ $2,5 · 2: ≤ $6 · 3: ≤ $15 · 4: > $15.
 * Mỗi tài khoản có quyền truy cập khác nhau, nên luôn có ô "tự nhập".
 * Kiểm: `tests/unit/ai-model-catalog.test.ts` giữ mặc định của từng hãng
 * (ai-environment.ts) luôn nằm trong danh mục này.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const NGAY_TRA_DANH_MUC = "20/09/2026";

export const aiModelCatalog: Record<AiProviderId, AiModelOption[]> = {
  openai: [
    { id: "gpt-5.6-luna", label: "GPT-5.6 Luna (rẻ)", cost: 1, speed: "fast" },
    { id: "gpt-5.6-terra", label: "GPT-5.6 Terra", cost: 3, speed: "balanced" },
    { id: "gpt-5.6-sol", label: "GPT-5.6 Sol", cost: 4, speed: "deep" },
    { id: "gpt-6-astra", label: "GPT-6 Astra (mạnh nhất)", cost: 4, speed: "deep" },
    { id: "gpt-5.5", label: "GPT-5.5", cost: 4, speed: "deep" },
    { id: "gpt-5.4", label: "GPT-5.4", cost: 3, speed: "balanced" },
    { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", cost: 2, speed: "fast" },
    { id: "gpt-5.4-nano", label: "GPT-5.4 Nano", cost: 1, speed: "fast" },
  ],
  deepseek: [
    { id: "deepseek-flash", label: "DeepSeek Flash (V4.1 — rẻ nhất)", cost: 1, speed: "fast" },
    { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", cost: 2, speed: "deep" },
  ],
  gemini: [
    { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", cost: 2, speed: "fast" },
    { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash", cost: 2, speed: "balanced" },
    { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", cost: 2, speed: "balanced" },
    { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite", cost: 1, speed: "fast" },
    { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", cost: 1, speed: "fast" },
    { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (rẻ nhất)", cost: 1, speed: "fast" },
    { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)", cost: 3, speed: "deep" },
  ],
  anthropic: [
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (nhanh)", cost: 2, speed: "fast" },
    { id: "claude-sonnet-5", label: "Claude Sonnet 5", cost: 3, speed: "balanced" },
    { id: "claude-opus-5", label: "Claude Opus 5", cost: 4, speed: "deep" },
    { id: "claude-fable-5-1", label: "Claude Fable 5.1 (mạnh nhất)", cost: 4, speed: "deep" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (cũ)", cost: 2, speed: "balanced" },
    { id: "claude-opus-4-8", label: "Claude Opus 4.8 (cũ)", cost: 4, speed: "deep" },
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

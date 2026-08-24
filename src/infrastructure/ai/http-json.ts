import { AiProviderError } from "@/infrastructure/ai/ai-provider-error";

export async function fetchProviderJson(
  provider: string,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    throw new AiProviderError(
      "AI_PROVIDER_UNREACHABLE",
      "Không thể kết nối đến AI provider.",
      { provider },
      cause,
    );
  }

  if (!response.ok) {
    // Lấy thông điệp lỗi gốc từ provider (OpenAI/DeepSeek/Anthropic: error.message;
    // Gemini: error.message) — không chứa API key, giúp chẩn đoán sai model/quota.
    let detail: string | undefined;
    try {
      const body = (await response.json()) as {
        error?: { message?: unknown } | string;
        message?: unknown;
      };
      const raw =
        typeof body.error === "string"
          ? body.error
          : typeof body.error?.message === "string"
            ? body.error.message
            : typeof body.message === "string"
              ? body.message
              : undefined;
      detail = raw?.slice(0, 200);
    } catch {
      // Body không phải JSON — bỏ qua, giữ status là manh mối duy nhất.
    }
    throw new AiProviderError(
      "AI_PROVIDER_REJECTED",
      "AI provider từ chối yêu cầu.",
      { provider, status: response.status, ...(detail ? { detail } : {}) },
    );
  }

  try {
    return await response.json();
  } catch (cause) {
    throw new AiProviderError(
      "AI_PROVIDER_INVALID_RESPONSE",
      "AI provider trả về dữ liệu không hợp lệ.",
      { provider },
      cause,
    );
  }
}

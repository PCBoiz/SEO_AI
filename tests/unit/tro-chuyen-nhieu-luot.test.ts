import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AnthropicModelProvider,
  DeepSeekModelProvider,
  GeminiModelProvider,
  OpenAiModelProvider,
} from "@/infrastructure/ai/live-ai-model-providers";
import type { AiProviderConfiguration } from "@/infrastructure/config/ai-environment";

afterEach(() => {
  vi.unstubAllGlobals();
});

function cauHinh(id: AiProviderConfiguration["id"]): AiProviderConfiguration {
  return {
    id,
    label: id,
    model: `${id}-test-model`,
    mode: "live",
    apiKey: "test-secret-key",
    timeoutMs: 5_000,
    maxOutputTokens: 128,
  };
}

const hoiThoai = {
  prompt: "không được dùng khi có messages",
  systemPrompt: "Trả lời tiếng Việt",
  maxOutputTokens: 128,
  messages: [
    { role: "user" as const, content: "Tôi muốn làm website sàn môi giới" },
    { role: "assistant" as const, content: "Website cần mấy trang?" },
    { role: "user" as const, content: "Ba trang" },
  ],
};

/** Chặn fetch, trả `tra`; trả hàm đọc thân yêu cầu đã gửi. */
function chanFetch(tra: unknown): () => Record<string, unknown> {
  const fetcher = vi.fn().mockResolvedValue(Response.json(tra));
  vi.stubGlobal("fetch", fetcher);
  return () => JSON.parse(String((fetcher.mock.calls[0]![1] as RequestInit).body)) as Record<string, unknown>;
}

describe("hội thoại nhiều lượt — cả bốn nhà cung cấp gửi đúng dạng", () => {
  it("OpenAI: input là mảng lượt; một lượt thì vẫn là chuỗi như trước", async () => {
    const tra = { id: "r", output: [{ content: [{ type: "output_text", text: "OK" }] }] };
    let than = chanFetch(tra);
    await new OpenAiModelProvider(cauHinh("openai")).generate(hoiThoai);
    expect(than().input).toEqual(hoiThoai.messages);
    expect(than().instructions).toBe("Trả lời tiếng Việt");

    vi.unstubAllGlobals();
    than = chanFetch(tra);
    await new OpenAiModelProvider(cauHinh("openai")).generate({ prompt: "Xin chào", maxOutputTokens: 16 });
    expect(than().input).toBe("Xin chào");
  });

  it("DeepSeek: system đứng đầu rồi đủ ba lượt; không có prompt lẻ", async () => {
    const than = chanFetch({ id: "d", choices: [{ message: { content: "OK" } }] });
    await new DeepSeekModelProvider(cauHinh("deepseek")).generate(hoiThoai);
    expect(than().messages).toEqual([{ role: "system", content: "Trả lời tiếng Việt" }, ...hoiThoai.messages]);
  });

  it("Gemini: vai trợ lý đổi thành \"model\"", async () => {
    const than = chanFetch({ candidates: [{ content: { parts: [{ text: "OK" }] } }] });
    await new GeminiModelProvider(cauHinh("gemini")).generate(hoiThoai);
    const contents = than().contents as Array<{ role: string; parts: Array<{ text: string }> }>;
    expect(contents.map((c) => c.role)).toEqual(["user", "model", "user"]);
    expect(contents[2]!.parts[0]!.text).toBe("Ba trang");
  });

  it("Anthropic: messages đủ ba lượt, system để riêng", async () => {
    const than = chanFetch({ id: "a", content: [{ type: "text", text: "OK" }] });
    await new AnthropicModelProvider(cauHinh("anthropic")).generate(hoiThoai);
    expect(than().messages).toEqual(hoiThoai.messages);
    expect(than().system).toBe("Trả lời tiếng Việt");
  });
});

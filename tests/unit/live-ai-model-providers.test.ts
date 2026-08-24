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

function configuration(
  id: AiProviderConfiguration["id"],
): AiProviderConfiguration {
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

const request = {
  prompt: "Xin chào",
  systemPrompt: "Trả lời tiếng Việt",
  maxOutputTokens: 128,
};

describe("live AI adapters", () => {
  it("parses OpenAI Responses API output without exposing the key", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        id: "resp-1",
        output: [{ content: [{ type: "output_text", text: "OpenAI OK" }] }],
        usage: { input_tokens: 3, output_tokens: 2, total_tokens: 5 },
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    const result = await new OpenAiModelProvider(
      configuration("openai"),
    ).generate(request);

    expect(result).toMatchObject({ text: "OpenAI OK", providerRequestId: "resp-1" });
    expect(JSON.stringify(result)).not.toContain("test-secret-key");
  });

  it("parses DeepSeek, Gemini, and Claude text/usage shapes", async () => {
    const responses = [
      {
        id: "deepseek-1",
        choices: [{ message: { content: "DeepSeek OK" } }],
        usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
      },
      {
        responseId: "gemini-1",
        candidates: [{ content: { parts: [{ text: "Gemini OK" }] } }],
        usageMetadata: {
          promptTokenCount: 2,
          candidatesTokenCount: 3,
          totalTokenCount: 5,
        },
      },
      {
        id: "claude-1",
        content: [{ type: "text", text: "Claude OK" }],
        usage: { input_tokens: 2, output_tokens: 3 },
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(Response.json(responses.shift())),
      ),
    );

    const results = await Promise.all([
      new DeepSeekModelProvider(configuration("deepseek")).generate(request),
      new GeminiModelProvider(configuration("gemini")).generate(request),
      new AnthropicModelProvider(configuration("anthropic")).generate(request),
    ]);

    expect(results.map((result) => result.text)).toEqual([
      "DeepSeek OK",
      "Gemini OK",
      "Claude OK",
    ]);
    expect(results.every((result) => result.usage.totalTokens === 5)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { buildUserAiProviderConfiguration } from "@/infrastructure/config/ai-environment";
import { DeepSeekModelProvider } from "@/infrastructure/ai/live-ai-model-providers";

describe("buildUserAiProviderConfiguration (BYOK)", () => {
  it("dựng config live từ API key của người dùng", () => {
    const config = buildUserAiProviderConfiguration({
      provider: "deepseek",
      model: "deepseek-v4-flash",
      apiKey: "sk-user-key",
    });
    expect(config).toMatchObject({
      id: "deepseek",
      model: "deepseek-v4-flash",
      mode: "live",
      apiKey: "sk-user-key",
    });
  });

  it("ném lỗi khi thiếu API key", () => {
    expect(() =>
      buildUserAiProviderConfiguration({
        provider: "openai",
        model: "gpt-5.6-terra",
        apiKey: "",
      }),
    ).toThrow();
  });

  it("từ chối API key dạng placeholder <...>", () => {
    expect(() =>
      buildUserAiProviderConfiguration({
        provider: "openai",
        model: "gpt-5.6-terra",
        apiKey: "<your-key>",
      }),
    ).toThrow();
  });

  it("ném lỗi khi thiếu model", () => {
    expect(() =>
      buildUserAiProviderConfiguration({
        provider: "gemini",
        model: "   ",
        apiKey: "AIza-user-key",
      }),
    ).toThrow();
  });

  it("adapter live nhận đúng config dựng từ key người dùng", () => {
    const config = buildUserAiProviderConfiguration({
      provider: "deepseek",
      model: "deepseek-v4-flash",
      apiKey: "sk-x",
    });
    const provider = new DeepSeekModelProvider(config);
    expect(provider.id).toBe("deepseek");
    expect(provider.model).toBe("deepseek-v4-flash");
    expect(provider.mode).toBe("live");
  });
});

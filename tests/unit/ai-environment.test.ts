import { describe, expect, it } from "vitest";
import {
  getAiProviderConfiguration,
  getAiProviderStatuses,
} from "@/infrastructure/config/ai-environment";
import { ConfigurationError } from "@/domain/shared/app-error";

describe("AI provider environment", () => {
  it("defaults to safe mock mode with current configurable model names", () => {
    const statuses = getAiProviderStatuses({});

    expect(statuses).toHaveLength(4);
    expect(statuses.every((status) => status.mode === "mock")).toBe(true);
    expect(statuses.every((status) => status.available)).toBe(true);
    expect(statuses.find((status) => status.id === "openai")?.model).toBe(
      "gpt-5.6-terra",
    );
    expect(statuses.find((status) => status.id === "anthropic")?.model).toBe(
      "claude-sonnet-5",
    );
  });

  it("requires a real server credential for a live provider", () => {
    expect(() =>
      getAiProviderConfiguration("openai", {
        AI_EXECUTION_MODE: "live",
        AI_LIVE_PROVIDERS: "openai",
        OPENAI_API_KEY: "<OPENAI_SERVER_API_KEY>",
      }),
    ).toThrow(ConfigurationError);

    expect(
      getAiProviderConfiguration("openai", {
        AI_EXECUTION_MODE: "live",
        AI_LIVE_PROVIDERS: "openai",
        OPENAI_API_KEY: "test-server-key",
        OPENAI_MODEL: "test-model",
      }),
    ).toMatchObject({
      id: "openai",
      mode: "live",
      model: "test-model",
      apiKey: "test-server-key",
    });
  });

  it("chỉ bật live cho provider nằm trong allowlist", () => {
    const statuses = getAiProviderStatuses({
      AI_EXECUTION_MODE: "live",
      AI_LIVE_PROVIDERS: "deepseek",
      DEEPSEEK_API_KEY: "deepseek-test-key",
      OPENAI_API_KEY: "openai-test-key",
    });

    expect(statuses.find((status) => status.id === "deepseek")?.mode).toBe(
      "live",
    );
    expect(statuses.find((status) => status.id === "openai")?.mode).toBe(
      "mock",
    );
  });

  it("không cho bật live nếu thiếu allowlist hoặc có provider lạ", () => {
    expect(() =>
      getAiProviderStatuses({ AI_EXECUTION_MODE: "live" }),
    ).toThrow(ConfigurationError);
    expect(() =>
      getAiProviderStatuses({
        AI_EXECUTION_MODE: "live",
        AI_LIVE_PROVIDERS: "deepseek,unknown",
      }),
    ).toThrow(ConfigurationError);
  });

  it("normalizes harmless whitespace in deployment configuration", () => {
    expect(
      getAiProviderConfiguration("deepseek", {
        AI_EXECUTION_MODE: "  mock\r\n",
        DEEPSEEK_MODEL: " deepseek-test ",
      }),
    ).toMatchObject({ mode: "mock", model: "deepseek-test" });
  });
});

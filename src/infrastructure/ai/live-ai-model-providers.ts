import { z } from "zod";
import type {
  AiGenerateRequest,
  AiGenerateResult,
  AiModelProvider,
  AiProviderId,
  AiTokenUsage,
} from "@/domain/ai/ai-model-provider";
import type { AiProviderConfiguration } from "@/infrastructure/config/ai-environment";
import { AiProviderError } from "@/infrastructure/ai/ai-provider-error";
import { fetchProviderJson } from "@/infrastructure/ai/http-json";

abstract class LiveAiModelProvider implements AiModelProvider {
  readonly mode = "live" as const;
  readonly id: AiProviderId;
  readonly model: string;
  protected readonly apiKey: string;
  protected readonly timeoutMs: number;

  constructor(configuration: AiProviderConfiguration) {
    if (!configuration.apiKey) {
      throw new AiProviderError(
        "AI_PROVIDER_NOT_CONFIGURED",
        "AI provider chưa có khóa API ở server.",
        { provider: configuration.id },
      );
    }
    this.id = configuration.id;
    this.model = configuration.model;
    this.apiKey = configuration.apiKey;
    this.timeoutMs = configuration.timeoutMs;
  }

  abstract generate(request: AiGenerateRequest): Promise<AiGenerateResult>;

  protected result(
    startedAt: number,
    text: string,
    usage: AiTokenUsage,
    providerRequestId?: string,
  ): AiGenerateResult {
    if (!text.trim()) {
      throw new AiProviderError(
        "AI_PROVIDER_EMPTY_RESPONSE",
        "AI provider không trả về nội dung.",
        { provider: this.id },
      );
    }
    return {
      provider: this.id,
      model: this.model,
      mode: this.mode,
      text: text.trim(),
      usage,
      durationMs: Date.now() - startedAt,
      providerRequestId,
    };
  }
}

const openAiResponseSchema = z.object({
  id: z.string().optional(),
  output: z
    .array(
      z.object({
        content: z
          .array(
            z.object({
              type: z.string(),
              text: z.string().optional(),
            }).passthrough(),
          )
          .optional(),
      }).passthrough(),
    )
    .default([]),
  usage: z
    .object({
      input_tokens: z.number().int().optional(),
      output_tokens: z.number().int().optional(),
      total_tokens: z.number().int().optional(),
    })
    .optional(),
});

export class OpenAiModelProvider extends LiveAiModelProvider {
  async generate(request: AiGenerateRequest): Promise<AiGenerateResult> {
    const startedAt = Date.now();
    const raw = await fetchProviderJson(
      this.id,
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          instructions: request.systemPrompt,
          input: request.prompt,
          max_output_tokens: request.maxOutputTokens,
          store: false,
        }),
      },
      this.timeoutMs,
    );
    const parsed = openAiResponseSchema.parse(raw);
    const text = parsed.output
      .flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text ?? "")
      .join("\n");
    return this.result(
      startedAt,
      text,
      {
        inputTokens: parsed.usage?.input_tokens,
        outputTokens: parsed.usage?.output_tokens,
        totalTokens: parsed.usage?.total_tokens,
      },
      parsed.id,
    );
  }
}

const deepSeekResponseSchema = z.object({
  id: z.string().optional(),
  choices: z.array(
    z.object({
      message: z
        .object({
          content: z.string().nullable(),
          // Model V4 bật thinking mặc định có thể trả reasoning_content riêng.
          reasoning_content: z.string().nullable().optional(),
        })
        .passthrough(),
    }).passthrough(),
  ),
  usage: z
    .object({
      prompt_tokens: z.number().int().optional(),
      completion_tokens: z.number().int().optional(),
      total_tokens: z.number().int().optional(),
    })
    .optional(),
});

export class DeepSeekModelProvider extends LiveAiModelProvider {
  async generate(request: AiGenerateRequest): Promise<AiGenerateResult> {
    const startedAt = Date.now();
    const messages = [
      ...(request.systemPrompt
        ? [{ role: "system" as const, content: request.systemPrompt }]
        : []),
      { role: "user" as const, content: request.prompt },
    ];
    const raw = await fetchProviderJson(
      this.id,
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: request.maxOutputTokens,
          stream: false,
          // deepseek-v4-flash bật thinking mặc định: nếu không tắt, toàn bộ
          // budget token có thể bị reasoning ăn hết và content trả về rỗng.
          // Format chính thức theo api-docs.deepseek.com/guides/thinking_mode:
          // {"thinking": {"type": "disabled"}} — KHÔNG phải boolean.
          thinking: { type: "disabled" },
        }),
      },
      this.timeoutMs,
    );
    const parsed = deepSeekResponseSchema.parse(raw);
    const message = parsed.choices[0]?.message;
    return this.result(
      startedAt,
      message?.content || message?.reasoning_content || "",
      {
        inputTokens: parsed.usage?.prompt_tokens,
        outputTokens: parsed.usage?.completion_tokens,
        totalTokens: parsed.usage?.total_tokens,
      },
      parsed.id,
    );
  }
}

const geminiResponseSchema = z.object({
  responseId: z.string().optional(),
  candidates: z
    .array(
      z.object({
        // Gemini 3.x bật thinking mặc định: khi hết token vào phần "suy nghĩ",
        // candidate có thể không có parts. Khoan dung để lỗi nổi lên thành
        // EMPTY_RESPONSE (thông điệp rõ) thay vì ZodError khó hiểu.
        content: z
          .object({
            parts: z
              .array(z.object({ text: z.string().optional() }).passthrough())
              .default([]),
          })
          .default({ parts: [] }),
      }).passthrough(),
    )
    .default([]),
  usageMetadata: z
    .object({
      promptTokenCount: z.number().int().optional(),
      candidatesTokenCount: z.number().int().optional(),
      totalTokenCount: z.number().int().optional(),
    })
    .optional(),
});

export class GeminiModelProvider extends LiveAiModelProvider {
  async generate(request: AiGenerateRequest): Promise<AiGenerateResult> {
    const startedAt = Date.now();
    const raw = await fetchProviderJson(
      this.id,
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(request.systemPrompt
            ? { systemInstruction: { parts: [{ text: request.systemPrompt }] } }
            : {}),
          contents: [{ role: "user", parts: [{ text: request.prompt }] }],
          generationConfig: { maxOutputTokens: request.maxOutputTokens },
        }),
      },
      this.timeoutMs,
    );
    const parsed = geminiResponseSchema.parse(raw);
    const text = parsed.candidates[0]?.content.parts
      .map((part) => part.text ?? "")
      .join("\n") ?? "";
    return this.result(
      startedAt,
      text,
      {
        inputTokens: parsed.usageMetadata?.promptTokenCount,
        outputTokens: parsed.usageMetadata?.candidatesTokenCount,
        totalTokens: parsed.usageMetadata?.totalTokenCount,
      },
      parsed.responseId,
    );
  }
}

const anthropicResponseSchema = z.object({
  id: z.string().optional(),
  content: z.array(
    z.object({
      type: z.string(),
      text: z.string().optional(),
    }).passthrough(),
  ),
  usage: z
    .object({
      input_tokens: z.number().int().optional(),
      output_tokens: z.number().int().optional(),
    })
    .optional(),
});

export class AnthropicModelProvider extends LiveAiModelProvider {
  async generate(request: AiGenerateRequest): Promise<AiGenerateResult> {
    const startedAt = Date.now();
    const raw = await fetchProviderJson(
      this.id,
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxOutputTokens,
          system: request.systemPrompt,
          messages: [{ role: "user", content: request.prompt }],
        }),
      },
      this.timeoutMs,
    );
    const parsed = anthropicResponseSchema.parse(raw);
    const text = parsed.content
      .filter((item) => item.type === "text")
      .map((item) => item.text ?? "")
      .join("\n");
    const inputTokens = parsed.usage?.input_tokens;
    const outputTokens = parsed.usage?.output_tokens;
    return this.result(
      startedAt,
      text,
      {
        inputTokens,
        outputTokens,
        totalTokens:
          inputTokens !== undefined && outputTokens !== undefined
            ? inputTokens + outputTokens
            : undefined,
      },
      parsed.id,
    );
  }
}

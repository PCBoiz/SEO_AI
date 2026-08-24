import { z } from "zod";
import { aiProviderIds, type AiProviderId } from "@/domain/ai/ai-model-provider";
import { ConfigurationError } from "@/domain/shared/app-error";

const booleanEnvironmentValue = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false" || normalized === "") return false;
  return value;
}, z.boolean().default(false));

const schema = z
  .object({
    // Module 1 chạy app-native (BYOK) — không còn chế độ mock. BRIDGE_DATABASE_URL
    // là chuỗi kết nối Neon cho bridge Sitemap (service báo lỗi rõ nếu thiếu).
    BRIDGE_DATABASE_URL: z.string().trim().optional(),
    SITEMAP_LIVE_CANARY_ENABLED: booleanEnvironmentValue,
    SITEMAP_LIVE_ALLOWED_AI_PROVIDERS: z.string().default(""),
    SITEMAP_GOOGLE_SHEETS_FALLBACK_MODE: z
      .enum(["disabled", "manual_mirror"])
      .default("disabled"),
    SITEMAP_SHEET_MAPPING_VERIFIED: booleanEnvironmentValue,
    SITEMAP_PILOT_POLL_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .max(30_000)
      .default(2_000),
    MAKE_DISPATCH_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .max(60_000)
      .default(10_000),
  })
  .superRefine((environment, context) => {
    const allowedProviders = parseAllowedProviders(
      environment.SITEMAP_LIVE_ALLOWED_AI_PROVIDERS,
    );
    if (allowedProviders.invalid.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["SITEMAP_LIVE_ALLOWED_AI_PROVIDERS"],
        message: "Allowlist chứa AI provider không được hỗ trợ.",
      });
    }
    if (
      environment.SITEMAP_GOOGLE_SHEETS_FALLBACK_MODE === "manual_mirror" &&
      !environment.SITEMAP_SHEET_MAPPING_VERIFIED
    ) {
      context.addIssue({
        code: "custom",
        path: ["SITEMAP_SHEET_MAPPING_VERIFIED"],
        message:
          "Không được bật Google Sheets mirror trước khi mapping Sheet được xác minh.",
      });
    }
  });

export type SitemapPilotEnvironment = z.infer<typeof schema>;

export function parseSitemapPilotEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
): SitemapPilotEnvironment {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new ConfigurationError(
      "INVALID_SITEMAP_PILOT_ENVIRONMENT",
      "Cấu hình môi trường cho pilot Sitemap không hợp lệ.",
      { fields: result.error.issues.map((issue) => issue.path.join(".")) },
    );
  }
  return result.data;
}

export function getSitemapLiveAllowedAiProviders(
  environment: SitemapPilotEnvironment,
): AiProviderId[] {
  return parseAllowedProviders(
    environment.SITEMAP_LIVE_ALLOWED_AI_PROVIDERS,
  ).values;
}

function parseAllowedProviders(value: string): {
  values: AiProviderId[];
  invalid: string[];
} {
  const supported = new Set<string>(aiProviderIds);
  const values = Array.from(
    new Set(
      value
        .split(/[\s,]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  return {
    values: values.filter((item) => supported.has(item)) as AiProviderId[],
    invalid: values.filter((item) => !supported.has(item)),
  };
}

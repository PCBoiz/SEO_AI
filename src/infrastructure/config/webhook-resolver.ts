import { ConfigurationError } from "@/domain/shared/app-error";

const PROVIDER_ENVIRONMENT_KEYS = {
  RIS_SITEMAP: "MAKE_WEBHOOK_RIS_SITEMAP",
  RIS_SITEMAP_KEYWORDS: "MAKE_WEBHOOK_SITEMAP_KEYWORDS",
  RIS_ICN_KEYWORDS: "MAKE_WEBHOOK_ICN_KEYWORDS",
  RIS_IMPORTED_KEYWORDS: "MAKE_WEBHOOK_IMPORTED_KEYWORDS",
  RIS_ONPAGE_SEO: "MAKE_WEBHOOK_ONPAGE_SEO",
  RIS_HOMEPAGE_CONTENT: "MAKE_WEBHOOK_HOMEPAGE_CONTENT",
  RIS_CONTENT_HEADLINE: "MAKE_WEBHOOK_CONTENT_HEADLINE",
  RIS_CONTENT_INTRO: "MAKE_WEBHOOK_CONTENT_INTRO",
  RIS_CONTENT_SECTIONS: "MAKE_WEBHOOK_CONTENT_SECTIONS",
  RIS_UPLOAD_WORDPRESS: "MAKE_WEBHOOK_UPLOAD_WORDPRESS",
} as const;

export type MakeProviderKey = keyof typeof PROVIDER_ENVIRONMENT_KEYS;

export interface WebhookResolver {
  resolve(providerKey: string): string;
}

export class EnvironmentWebhookResolver implements WebhookResolver {
  constructor(
    private readonly environment: Readonly<Record<string, string | undefined>> =
      process.env,
  ) {}

  resolve(providerKey: string): string {
    const environmentKey =
      PROVIDER_ENVIRONMENT_KEYS[providerKey as MakeProviderKey];
    if (!environmentKey) {
      throw new ConfigurationError(
        "UNKNOWN_PROVIDER_KEY",
        "No server-side webhook mapping exists for the requested provider key.",
        { providerKey },
      );
    }

    const rawValue = this.environment[environmentKey]?.trim();
    if (!rawValue || /^<.*>$/.test(rawValue)) {
      throw new ConfigurationError(
        "WEBHOOK_NOT_CONFIGURED",
        "The requested automation webhook is not configured.",
        { providerKey },
      );
    }

    try {
      const url = new URL(rawValue);
      if (url.protocol !== "https:") {
        throw new Error("Webhook URLs must use HTTPS.");
      }
      return url.toString();
    } catch {
      throw new ConfigurationError(
        "INVALID_WEBHOOK_URL",
        "The requested automation webhook configuration is invalid.",
        { providerKey },
      );
    }
  }
}

import { describe, expect, it } from "vitest";
import { ConfigurationError } from "@/domain/shared/app-error";
import { EnvironmentWebhookResolver } from "@/infrastructure/config/webhook-resolver";

describe("EnvironmentWebhookResolver", () => {
  it("resolves a known provider key from server-only configuration", () => {
    const resolver = new EnvironmentWebhookResolver({
      MAKE_WEBHOOK_RIS_SITEMAP: "https://hooks.example.test/sitemap",
    });

    expect(resolver.resolve("RIS_SITEMAP")).toBe(
      "https://hooks.example.test/sitemap",
    );
  });

  it("rejects unknown, placeholder, and non-HTTPS mappings", () => {
    expect(() =>
      new EnvironmentWebhookResolver({}).resolve("UNKNOWN"),
    ).toThrow(ConfigurationError);
    expect(() =>
      new EnvironmentWebhookResolver({
        MAKE_WEBHOOK_RIS_SITEMAP: "<MAKE_WEBHOOK_URL>",
      }).resolve("RIS_SITEMAP"),
    ).toThrow(ConfigurationError);
    expect(() =>
      new EnvironmentWebhookResolver({
        MAKE_WEBHOOK_RIS_SITEMAP: "http://hooks.example.test/sitemap",
      }).resolve("RIS_SITEMAP"),
    ).toThrow(ConfigurationError);
  });

  it("does not include a configured secret URL in error messages", () => {
    const secretValue = "not-a-valid-url-secret-value";
    const resolver = new EnvironmentWebhookResolver({
      MAKE_WEBHOOK_RIS_SITEMAP: secretValue,
    });

    expect(() => resolver.resolve("RIS_SITEMAP")).toThrowError(
      expect.not.objectContaining({ message: expect.stringContaining(secretValue) }),
    );
  });
});

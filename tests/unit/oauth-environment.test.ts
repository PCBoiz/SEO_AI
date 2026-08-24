import { describe, expect, it } from "vitest";
import { ConfigurationError } from "@/domain/shared/app-error";
import {
  getOAuthProviderConfiguration,
  getOAuthProviderStatuses,
} from "@/infrastructure/config/oauth-environment";

describe("OAuth environment", () => {
  it("treats blank and documented placeholder credentials as unconfigured", () => {
    const statuses = getOAuthProviderStatuses({
      GOOGLE_OAUTH_CLIENT_ID: "<GOOGLE_WEB_CLIENT_ID>",
      GOOGLE_OAUTH_CLIENT_SECRET: "<GOOGLE_WEB_CLIENT_SECRET>",
      MAKE_OAUTH_CLIENT_ID: "",
      MAKE_OAUTH_CLIENT_SECRET: "",
      MAKE_OAUTH_SCOPES: "<MAKE_APPROVED_SCOPES_SPACE_SEPARATED>",
    });

    expect(statuses).toEqual([
      { id: "google", configured: false, automationScopesConfigured: true },
      { id: "make", configured: false, automationScopesConfigured: false },
    ]);
  });

  it("uses exact callback and incremental Google automation scopes", () => {
    const configuration = getOAuthProviderConfiguration("google", "connect", {
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
      GOOGLE_OAUTH_CLIENT_ID: "google-client",
      GOOGLE_OAUTH_CLIENT_SECRET: "google-secret",
    });

    expect(configuration.redirectUri).toBe(
      "http://127.0.0.1:3000/api/v1/oauth/google/callback",
    );
    expect(configuration.scopes).toContain(
      "https://www.googleapis.com/auth/drive.file",
    );
    expect(configuration.scopes).toContain(
      "https://www.googleapis.com/auth/spreadsheets",
    );
  });

  it("fails closed when Make automation scopes were not verified", () => {
    expect(() =>
      getOAuthProviderConfiguration("make", "connect", {
        MAKE_OAUTH_CLIENT_ID: "make-client",
        MAKE_OAUTH_CLIENT_SECRET: "make-secret",
      }),
    ).toThrow(ConfigurationError);
  });
});

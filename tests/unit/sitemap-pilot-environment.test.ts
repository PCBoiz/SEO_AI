import { describe, expect, it } from "vitest";
import { ConfigurationError } from "@/domain/shared/app-error";
import { parseSitemapPilotEnvironment } from "@/infrastructure/config/sitemap-pilot-environment";

describe("cấu hình môi trường pilot Sitemap", () => {
  it("mặc định hợp lệ mà không cần bridge (Module 1 luôn app-native BYOK)", () => {
    const environment = parseSitemapPilotEnvironment({});
    expect(environment).toMatchObject({ SITEMAP_PILOT_POLL_INTERVAL_MS: 2_000 });
    // Không throw khi thiếu bridge — service.server tự báo lỗi rõ khi chạy.
    expect(environment.BRIDGE_DATABASE_URL).toBeUndefined();
  });

  it("từ chối AI allowlist chứa provider không được hỗ trợ", () => {
    expect(() =>
      parseSitemapPilotEnvironment({
        SITEMAP_LIVE_ALLOWED_AI_PROVIDERS: "provider-la",
      }),
    ).toThrow(ConfigurationError);
  });

  it("không bật Sheets mirror khi mapping chưa được xác minh", () => {
    expect(() =>
      parseSitemapPilotEnvironment({
        SITEMAP_GOOGLE_SHEETS_FALLBACK_MODE: "manual_mirror",
      }),
    ).toThrow(ConfigurationError);
    expect(
      parseSitemapPilotEnvironment({
        SITEMAP_GOOGLE_SHEETS_FALLBACK_MODE: "manual_mirror",
        SITEMAP_SHEET_MAPPING_VERIFIED: "true",
      }).SITEMAP_GOOGLE_SHEETS_FALLBACK_MODE,
    ).toBe("manual_mirror");
  });
});

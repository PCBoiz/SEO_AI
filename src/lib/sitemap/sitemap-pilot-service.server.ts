import "server-only";

import { SitemapPilotService } from "@/application/sitemap/sitemap-pilot-service";
import { aiProviderIds } from "@/domain/ai/ai-model-provider";
import { ConfigurationError } from "@/domain/shared/app-error";
import { parseSitemapPilotEnvironment } from "@/infrastructure/config/sitemap-pilot-environment";
import { NeonSitemapPilotJobRepository } from "@/infrastructure/sitemap/neon-sitemap-pilot-job-repository";
import { NeonProjectRepository } from "@/infrastructure/projects/neon-project-repository";
import { SqliteProjectRepository } from "@/infrastructure/projects/sqlite-project-repository";
import { databaseAdapter } from "@/lib/db";

let service: SitemapPilotService | undefined;

function isBridgeConfigured(url: string | undefined): url is string {
  return Boolean(url && url.trim() && !/^<.*>$/.test(url));
}

export function getSitemapPilotService(): SitemapPilotService {
  if (service) return service;
  const environment = parseSitemapPilotEnvironment();
  if (!isBridgeConfigured(environment.BRIDGE_DATABASE_URL)) {
    throw new ConfigurationError(
      "SITEMAP_BRIDGE_NOT_CONFIGURED",
      "Module 1 chưa được cấu hình: thiếu BRIDGE_DATABASE_URL (chuỗi kết nối Neon cho bridge Sitemap).",
    );
  }
  const projects =
    databaseAdapter.kind === "neon"
      ? new NeonProjectRepository(databaseAdapter.db)
      : new SqliteProjectRepository(databaseAdapter.db);
  // Module 1 chạy app-native (BYOK): job được tạo ở trạng thái chờ; route API lên
  // lịch chạy nền qua after() với API key của chính user. Không webhook ra ngoài.
  service = new SitemapPilotService(
    new NeonSitemapPilotJobRepository(environment.BRIDGE_DATABASE_URL),
    projects,
    {
      id: "app_native",
      trigger: async (jobId, nodeId) => ({
        jobId,
        nodeId,
        status: "pending",
      }),
    },
    {
      // BYOK: người dùng trả phí bằng key của chính họ → mở đủ bốn provider.
      // Rào chắn thật sự là phải có key hợp lệ trong trang API Keys.
      allowedAiProviders: [...aiProviderIds],
      maxSites: 1,
      requireCostConfirmation: true,
    },
  );
  return service;
}

export function getSitemapPilotRuntimeSummary(): {
  pollIntervalMs: number;
  persistence: "sqlite" | "neon";
  bridgeConfigured: boolean;
} {
  const environment = parseSitemapPilotEnvironment();
  return {
    pollIntervalMs: environment.SITEMAP_PILOT_POLL_INTERVAL_MS,
    persistence: databaseAdapter.kind,
    bridgeConfigured: isBridgeConfigured(environment.BRIDGE_DATABASE_URL),
  };
}

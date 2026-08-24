import "server-only";

import type { AiProviderId } from "@/domain/ai/ai-model-provider";
import {
  buildSitemapDraftPrompt,
  buildSitemapOrganizePrompt,
  buildSitemapSelectionPrompt,
  sitemapDraftSystemPrompt,
  sitemapOrganizeSystemPrompt,
  sitemapSelectionSystemPrompt,
  validateSitemapFormat,
} from "@/domain/sitemap/sitemap-prompts";
import { generateWithRetry } from "@/domain/modules/generate-with-retry";
import type { SitemapPilotOutput } from "@/domain/sitemap/sitemap-pilot";
import { parseSitemapStructure } from "@/domain/sitemap/sitemap-structure";
import { AiProviderError } from "@/infrastructure/ai/ai-provider-error";
import { NeonSitemapPilotJobRepository } from "@/infrastructure/sitemap/neon-sitemap-pilot-job-repository";
import { parseSitemapPilotEnvironment } from "@/infrastructure/config/sitemap-pilot-environment";
import { getAiKeyService } from "@/lib/ai/ai-key-service.server";
import { getUserAiModelProvider } from "@/lib/ai/ai-provider-registry.server";
import { logger } from "@/infrastructure/observability/logger";

// Chạy job Module 1 hoàn toàn trong app (BYOK): giải mã key của user, gọi model
// hai bước (draft → chọn nhãn), ghi kết quả về Neon. Được gọi trong after() nên
// không chặn response; UI tiếp tục polling như cũ. Key không rời server và không
// bao giờ được ghi vào job, log hay thông báo lỗi.
export async function runSitemapJobAppNative(
  workspaceId: string,
  userId: string,
  jobId: string,
): Promise<void> {
  const environment = parseSitemapPilotEnvironment();
  const repository = new NeonSitemapPilotJobRepository(
    environment.BRIDGE_DATABASE_URL!,
  );

  try {
    const job = await repository.getById(workspaceId, jobId);
    if (!job) return;
    if (!["queued", "dispatching"].includes(job.status)) return;

    const provider = job.input.ai.provider as AiProviderId;
    const usable = await getAiKeyService().getUsableKey(userId, provider);
    if (!usable) {
      await repository.setStatus(workspaceId, jobId, "failed", new Date(), {
        errorCode: "AI_USER_KEY_MISSING",
        errorMessage: `Chưa có API key ${provider} — vào trang "API Keys" để thêm và verify trước khi chạy.`,
      });
      return;
    }
    // Ưu tiên model user đã verify trên màn hình API Keys; fallback model của job.
    const model = usable.model?.trim() || job.input.ai.model;

    await repository.setStatus(workspaceId, jobId, "running", new Date());

    const draftAdapter = getUserAiModelProvider({
      provider,
      model,
      apiKey: usable.apiKey,
      timeoutMs: 120_000,
      maxOutputTokens: 4_096,
    });

    // Mọi lượt gọi đều đi qua generateWithRetry: sai định dạng thì model được
    // nhắc đúng chỗ sai và gọi lại một lần. Nhờ vậy chất lượng đồng đều trên
    // mọi provider mà không phải viết prompt riêng cho từng model.
    const generate = (request: {
      systemPrompt: string;
      prompt: string;
      maxOutputTokens: number;
      validate?: typeof validateSitemapFormat;
    }): Promise<string> =>
      generateWithRetry(
        async ({ systemPrompt, prompt, maxOutputTokens }) => {
          const result = await draftAdapter.generate({
            systemPrompt,
            prompt,
            maxOutputTokens: maxOutputTokens ?? request.maxOutputTokens,
          });
          return result.text;
        },
        {
          ...request,
          onRetry: (issues) =>
            logger.warn(
              { jobId, issues: issues.map((issue) => issue.message) },
              "sitemap sai định dạng — gọi lại model một lần",
            ),
        },
      );

    const sites: SitemapPilotOutput["sites"] = [];
    for (const site of job.input.sites) {
      const draftText = await generate({
        systemPrompt: sitemapDraftSystemPrompt,
        prompt: buildSitemapDraftPrompt(site),
        maxOutputTokens: 4_096,
        validate: validateSitemapFormat,
      });
      const selectionText = await generate({
        systemPrompt: sitemapSelectionSystemPrompt,
        prompt: buildSitemapSelectionPrompt(draftText),
        maxOutputTokens: 2_048,
        validate: validateSitemapFormat,
      });
      // Bước 3: tổ chức danh sách phẳng thành CÂY PHÂN CẤP (thụt lề) để sơ đồ
      // cây/mindmap thể hiện đúng quan hệ cha-con và người dùng sửa theo cấu trúc.
      const organizedText = await generate({
        systemPrompt: sitemapOrganizeSystemPrompt,
        prompt: buildSitemapOrganizePrompt(selectionText),
        maxOutputTokens: 2_048,
        validate: validateSitemapFormat,
      });
      const draft = { text: draftText };
      const hierarchical =
        organizedText && organizedText.trim().length > 0
          ? organizedText
          : selectionText;
      sites.push({
        reference: site.reference,
        draftSitemap: draft.text,
        selectedSitemap: hierarchical,
        structure: parseSitemapStructure(hierarchical, site.reference),
      });
    }

    await repository.setStatus(workspaceId, jobId, "succeeded", new Date(), {
      output: { contractVersion: "1.0", sites },
    });
  } catch (error) {
    logger.error(
      { jobId, err: error instanceof Error ? error.message : "unknown" },
      "app-native sitemap job failed",
    );
    try {
      await repository.setStatus(workspaceId, jobId, "failed", new Date(), {
        errorCode:
          error instanceof Error && "code" in error
            ? String((error as { code: unknown }).code)
            : "APP_NATIVE_EXECUTION_FAILED",
        errorMessage: sanitizeErrorMessage(error),
      });
    } catch {
      // Job có thể đã chuyển trạng thái bởi lần chạy khác — không ghi đè.
    }
  }
}

function sanitizeErrorMessage(error: unknown): string {
  let raw =
    error instanceof Error ? error.message : "Không thể chạy job Sitemap.";
  // AiProviderError giữ HTTP status + thông điệp gốc của provider trong details
  // — nối vào để owner thấy chính xác provider từ chối vì lý do gì.
  if (error instanceof AiProviderError) {
    const status =
      typeof error.details?.status === "number"
        ? ` (HTTP ${error.details.status})`
        : "";
    const detail =
      typeof error.details?.detail === "string"
        ? ` Provider báo: "${error.details.detail}"`
        : "";
    raw = `${raw}${status}${detail}`;
  }
  // Cắt ngắn và loại mọi chuỗi trông giống secret trước khi lưu vào Neon.
  return raw
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-***")
    .replace(/AIza[A-Za-z0-9_-]{8,}/g, "AIza***")
    .slice(0, 500);
}

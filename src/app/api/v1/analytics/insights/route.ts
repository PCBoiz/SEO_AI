import { ValidationError } from "@/domain/shared/app-error";
import { aiProviderIds, type AiProviderId } from "@/domain/ai/ai-model-provider";
import { listModuleDefinitions } from "@/domain/modules/module-definition";
import "@/domain/modules/registry";
import type { ModuleJob } from "@/domain/modules/module-job";
import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity } from "@/lib/auth/dal";
import { getModuleJobService } from "@/lib/modules/module-service.server";
import { getProjectService } from "@/lib/projects/project-service.server";
import { getAiKeyService } from "@/lib/ai/ai-key-service.server";
import { getUserAiModelProvider } from "@/lib/ai/ai-provider-registry.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Nhận định AI trên dữ liệu nội bộ (module_jobs): gom số liệu → gọi model bằng
// API key BYOK của chính user → trả khuyến nghị hành động. On-demand (nút bấm).
export async function POST(request: Request): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const body = (await request.json().catch(() => ({}))) as {
      provider?: unknown;
      model?: unknown;
    };
    const provider = body.provider;
    if (typeof provider !== "string" || !aiProviderIds.includes(provider as AiProviderId)) {
      throw new ValidationError("AI_PROVIDER_INVALID", "Provider AI không hợp lệ.");
    }
    const requestedModel = typeof body.model === "string" ? body.model.trim() : "";

    const usable = await getAiKeyService().getUsableKey(
      identity.userId,
      provider as AiProviderId,
    );
    if (!usable) {
      throw new ValidationError(
        "AI_USER_KEY_MISSING",
        `Chưa có API key ${provider} — vào trang "API Keys" để thêm và verify trước.`,
      );
    }
    const model = usable.model?.trim() || requestedModel;
    if (!model) {
      throw new ValidationError(
        "AI_MODEL_MISSING",
        "Chưa xác định model AI — lưu model ở trang API Keys.",
      );
    }

    const [projects, jobs] = await Promise.all([
      getProjectService().list(identity),
      getModuleJobService().listRecentActivity(identity, 50),
    ]);

    const adapter = getUserAiModelProvider({
      provider: provider as AiProviderId,
      model,
      apiKey: usable.apiKey,
      timeoutMs: 60_000,
      maxOutputTokens: 1_024,
    });
    const result = await adapter.generate({
      systemPrompt:
        "Bạn là cố vấn tự động hóa nội dung SEO + GEO. Đọc số liệu hoạt động của workspace và đưa khuyến nghị hành động cụ thể, thực tế. Chỉ trả về khuyến nghị.",
      prompt: [
        "Số liệu hoạt động gần đây của workspace:",
        buildStatsSummary(projects.length, jobs),
        "",
        "Hãy đưa 3–5 khuyến nghị hành động bằng tiếng Việt, xếp theo mức tác động. Mỗi khuyến nghị đánh số, 1–2 câu, nêu rõ nên làm gì tiếp theo (module nào nên chạy/cải thiện, xử lý lỗi ra sao, tối ưu SEO/GEO thế nào). Không giải thích dài dòng.",
      ].join("\n"),
      maxOutputTokens: 1_024,
    });

    return Response.json(
      { insights: result.text },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

function buildStatsSummary(projectCount: number, jobs: ModuleJob[]): string {
  const titleByKey = new Map(
    listModuleDefinitions().map((m) => [m.key, `#${m.moduleNumber} ${m.title}`]),
  );
  const total = jobs.length;
  const succeeded = jobs.filter((j) => j.status === "succeeded").length;
  const failed = jobs.filter((j) =>
    ["failed", "timed_out"].includes(j.status),
  ).length;
  const rate = total > 0 ? Math.round((succeeded / total) * 100) : 0;

  const perModule = new Map<string, number>();
  for (const job of jobs) {
    perModule.set(job.moduleKey, (perModule.get(job.moduleKey) ?? 0) + 1);
  }
  const topModules = [...perModule.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key, count]) => `- ${titleByKey.get(key) ?? key}: ${count} lần`);

  const failedModules = [
    ...new Set(
      jobs
        .filter((j) => ["failed", "timed_out"].includes(j.status))
        .map((j) => titleByKey.get(j.moduleKey) ?? j.moduleKey),
    ),
  ];

  const usedModuleCount = perModule.size;
  const allModuleCount = titleByKey.size;

  return [
    `- Số dự án: ${projectCount}`,
    `- Lần chạy gần đây (tối đa 50): ${total}; thành công ${succeeded} (${rate}%); lỗi ${failed}`,
    `- Số loại module đã dùng: ${usedModuleCount}/${allModuleCount}`,
    topModules.length > 0 ? `- Module chạy nhiều nhất:\n${topModules.join("\n")}` : "",
    failedModules.length > 0
      ? `- Module từng lỗi/quá giờ: ${failedModules.join(", ")}`
      : "- Không có module nào lỗi gần đây",
  ]
    .filter(Boolean)
    .join("\n");
}

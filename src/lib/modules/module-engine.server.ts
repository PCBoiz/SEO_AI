import "server-only";

import type { AiProviderId } from "@/domain/ai/ai-model-provider";
import {
  flattenModuleOutput,
  getModuleDefinition,
  parseModuleInput,
} from "@/domain/modules/module-definition";
import "@/domain/modules/registry";
import { generateWithRetry } from "@/domain/modules/generate-with-retry";
import type { ModuleJob } from "@/domain/modules/module-job";
import { chonJobUpstream } from "@/domain/modules/upstream";
import { setSiteScanner } from "@/domain/modules/definitions/site-scan";
import { scanWebsite } from "@/lib/site-audit/scan-website.server";
import type { ModuleJobRepository } from "@/domain/modules/module-job-repository";
import { NeonModuleJobRepository } from "@/infrastructure/modules/neon-module-job-repository";
import { SqliteModuleJobRepository } from "@/infrastructure/modules/sqlite-module-job-repository";
import { getAiKeyService } from "@/lib/ai/ai-key-service.server";
import { getUserAiModelProvider } from "@/lib/ai/ai-provider-registry.server";
import { getWordpressCredentials } from "@/lib/integrations/wordpress-credentials.server";
import { layThuMucAnh } from "@/lib/integrations/drive-folder.server";
import { docMoTaAnh, lietKeAnh, taiAnh } from "@/lib/google/drive.server";
import { thuAnhChoWeb } from "@/lib/google/anh-web.server";
import type { DriveChoModule } from "@/domain/modules/module-definition";
import { getSocialCredentials } from "@/lib/integrations/integration-service.server";
import {
  extractErrorCode,
  sanitizeProviderErrorMessage,
} from "@/lib/ai/sanitize-provider-error";
import { databaseAdapter } from "@/lib/db";
import { logger } from "@/infrastructure/observability/logger";

// Module 20 gọi mạng để đọc website khách. Tầng domain không được phụ thuộc
// tầng mạng nên bơm hàm quét vào từ đây — module vẫn test được bằng dữ liệu giả.
setSiteScanner(scanWebsite);

export function getModuleJobRepository(): ModuleJobRepository {
  return databaseAdapter.kind === "neon"
    ? new NeonModuleJobRepository(databaseAdapter.db)
    : new SqliteModuleJobRepository(databaseAdapter.db);
}

// Engine app-native dùng chung cho mọi module (Module 2 trở đi). Gọi trong
// after() nên không chặn response; UI polling job như Module 1. Key BYOK được
// giải mã ở server, không bao giờ ghi vào job/log/lỗi.
export async function dungDriveChoModule(workspaceId: string, projectId: string): Promise<DriveChoModule | undefined> {
  const thuMuc = await layThuMucAnh(projectId);
  if (!thuMuc) return undefined;
  const chu = { workspaceId, userId: thuMuc.userId };
  return {
    async lietKe() {
      const [ds, moTa] = await Promise.all([lietKeAnh(chu, thuMuc.folderId, 200), docMoTaAnh(chu, thuMuc.folderId)]);
      if (ds.trangThai !== "ok") {
        logger.warn({ projectId, trangThai: ds.trangThai }, "drive cho module: khong liet ke duoc");
        return [];
      }
      return ds.duLieu.map((a) => ({
        id: a.id,
        ten: a.ten,
        thuMucCon: a.thuMucCon,
        rong: a.rong,
        cao: a.cao,
        moTa: moTa.get(a.ten),
      }));
    },
    async tai(id) {
      const t = await taiAnh(chu, thuMuc.folderId, id);
      if (t.trangThai !== "ok") {
        throw new Error(`Không tải được ảnh từ Drive: ${t.trangThai === "loi" ? t.lyDo : t.trangThai}`);
      }
      const web = await thuAnhChoWeb(t.duLieu.bytes);
      return { bytes: web.bytes, mime: web.mime, ten: t.duLieu.ten };
    },
    async taiNhieuCo(id, cacCanhDai) {
      const t = await taiAnh(chu, thuMuc.folderId, id);
      if (t.trangThai !== "ok") {
        throw new Error(`Không tải được ảnh từ Drive: ${t.trangThai === "loi" ? t.lyDo : t.trangThai}`);
      }
      // Mỗi cỡ thu từ BẢN GỐC (không thu từ bản đã nén — nén hai lần là mất nét).
      const cac = await Promise.all(cacCanhDai.map((c) => thuAnhChoWeb(t.duLieu.bytes, c)));
      const daCo = new Set<number>();
      const co = cac.flatMap((w) => (daCo.has(w.rong) ? [] : (daCo.add(w.rong), [{ bytes: w.bytes, rong: w.rong, cao: w.cao }])));
      return { ten: t.duLieu.ten, co };
    },
  };
}

export async function runModuleJobAppNative(
  workspaceId: string,
  userId: string,
  jobId: string,
): Promise<void> {
  const repository = getModuleJobRepository();

  try {
    const job = await repository.getById(workspaceId, jobId);
    if (!job) return;
    if (!["queued", "dispatching"].includes(job.status)) return;

    const definition = getModuleDefinition(job.moduleKey);
    const input = parseModuleInput(definition, job.input);
    const provider = input.ai.provider as AiProviderId;
    const requiresAi = definition.requiresAi !== false;

    const usable = requiresAi
      ? await getAiKeyService().getUsableKey(userId, provider)
      : null;
    if (requiresAi && !usable) {
      await repository.setStatus(workspaceId, jobId, "failed", new Date(), {
        errorCode: "AI_USER_KEY_MISSING",
        errorMessage: `Chưa có API key ${provider} — vào trang "API Keys" để thêm và verify trước khi chạy.`,
      });
      return;
    }
    // Ưu tiên model user đã verify ở trang API Keys; fallback model của job.
    const model = usable?.model?.trim() || input.ai.model;

    // Tích hợp ngoài: engine giải mã credentials server-side và bơm vào context;
    // fail-closed với thông báo tiếng Việt rõ nếu dự án chưa cấu hình.
    const integrations: {
      wordpress?: { url: string; username: string; password: string };
      facebook?: { config: Record<string, string>; secret: string };
      zalo?: { config: Record<string, string>; secret: string };
      google_business?: { config: Record<string, string>; secret: string };
      custom_site?: { config: Record<string, string>; secret: string };
    } = {};
    if (definition.needsIntegrations?.includes("wordpress")) {
      const credentials = await getWordpressCredentials(
        workspaceId,
        job.projectId,
      );
      if (!credentials) {
        await repository.setStatus(workspaceId, jobId, "failed", new Date(), {
          errorCode: "WORDPRESS_NOT_CONFIGURED",
          errorMessage:
            "Dự án chưa cấu hình WordPress — vào Dự án → Sửa để thêm URL, username và Application Password trước khi đăng bài.",
        });
        return;
      }
      integrations.wordpress = credentials;
    }
    const socialLabels: Record<string, string> = {
      facebook: "Facebook Page (Page Access Token)",
      zalo: "Zalo OA (Access Token)",
      google_business: "Google Business Profile (Access Token)",
      custom_site: "Trang tự code (địa chỉ trang + khoá đăng bài)",
    };
    for (const type of [
      "facebook",
      "zalo",
      "google_business",
      "custom_site",
    ] as const) {
      const batBuoc = definition.needsIntegrations?.includes(type) ?? false;
      const tuyChon = definition.optionalIntegrations?.includes(type) ?? false;
      if (!batBuoc && !tuyChon) continue;
      const credentials = await getSocialCredentials(
        workspaceId,
        job.projectId,
        type,
      );
      // Tùy chọn mà chưa cấu hình: bơm `undefined` rồi đi tiếp. Module tự lo —
      // với module đăng sang trang tự code, "tự lo" nghĩa là rơi về biến môi
      // trường. Dừng job ở đây sẽ làm nhánh rơi về đó thành mã không bao giờ
      // chạy tới.
      if (!credentials && tuyChon && !batBuoc) continue;
      if (!credentials) {
        await repository.setStatus(workspaceId, jobId, "failed", new Date(), {
          errorCode: "INTEGRATION_NOT_CONFIGURED",
          errorMessage: `Dự án chưa cấu hình ${socialLabels[type]} — mở phần "Kết nối nền tảng" trên trang module này để dán token.`,
        });
        return;
      }
      integrations[type] = credentials;
    }

    // Nối luồng tự động: nạp đầu ra thành công mới nhất của các module khác trong
    // cùng dự án làm ngữ cảnh. Module dùng nếu cần; không có thì bỏ qua. Job
    // thuộc một lượt chạy cả luồng thì các bước đã xong CỦA LƯỢT ĐÓ thắng bản
    // ghim — xem `domain/modules/upstream.ts`.
    const priors = await repository.listLatestSucceededByProject(
      workspaceId,
      job.projectId,
    );
    const cuaLuot = input.upstreamJobIds?.length
      ? (
          await Promise.all(
            input.upstreamJobIds.map((id) => repository.getById(workspaceId, id)),
          )
        ).filter((item): item is ModuleJob => item !== null)
      : [];
    const upstream: Record<string, string> = {};
    for (const prior of chonJobUpstream(job, priors, cuaLuot)) {
      if (!prior.output) continue;
      try {
        const priorDefinition = getModuleDefinition(prior.moduleKey);
        upstream[prior.moduleKey] = flattenModuleOutput(
          priorDefinition,
          prior.output,
        );
      } catch {
        // Module chưa đăng ký (ví dụ dữ liệu cũ) — bỏ qua.
      }
    }

    // Thư mục ảnh Drive: bơm hai hàm đã gắn token của NGƯỜI NỐI THƯ MỤC (không
    // phải người chạy job — token của họ có thể không có quyền Drive). Không
    // nối, hoặc token hỏng → `undefined`, module tự lo.
    const drive = definition.needsDrive ? await dungDriveChoModule(workspaceId, job.projectId) : undefined;

    await repository.setStatus(workspaceId, jobId, "running", new Date());

    const adapter = usable
      ? getUserAiModelProvider({
          provider,
          model,
          apiKey: usable.apiKey,
          timeoutMs: 120_000,
          maxOutputTokens: 4_096,
        })
      : null;

    const output = await definition.execute({
      input: input as never,
      upstream,
      integrations,
      drive,
      async generate(request) {
        if (!adapter) {
          throw new Error("Module này không dùng AI nhưng đã gọi generate().");
        }
        return generateWithRetry(
          async ({ systemPrompt, prompt, maxOutputTokens }) => {
            const result = await adapter.generate({
              systemPrompt,
              prompt,
              maxOutputTokens: maxOutputTokens ?? 4_096,
            });
            return result.text;
          },
          {
            systemPrompt: request.systemPrompt,
            prompt: request.prompt,
            maxOutputTokens: request.maxOutputTokens ?? 4_096,
            validate: request.validate,
            onRetry: (issues) =>
              logger.warn(
                {
                  jobId,
                  moduleKey: job.moduleKey,
                  issues: issues.map((issue) => issue.message),
                },
                "đầu ra sai định dạng — gọi lại model một lần",
              ),
          },
        );
      },
    });

    // Validate output theo schema module trước khi lưu — hợp đồng đầu ra rõ ràng.
    const validated = definition.outputSchema.parse(output);
    await repository.setStatus(workspaceId, jobId, "succeeded", new Date(), {
      output: validated as Record<string, unknown>,
    });
  } catch (error) {
    logger.error(
      { jobId, err: error instanceof Error ? error.message : "unknown" },
      "app-native module job failed",
    );
    try {
      await repository.setStatus(workspaceId, jobId, "failed", new Date(), {
        errorCode: extractErrorCode(error, "MODULE_EXECUTION_FAILED"),
        errorMessage: sanitizeProviderErrorMessage(
          error,
          "Không thể chạy job module.",
        ),
      });
    } catch {
      // Job có thể đã đổi trạng thái bởi lần chạy khác — không ghi đè.
    }
  }
}

import { randomUUID } from "node:crypto";
import type { WorkspaceRole } from "@/domain/auth/permissions";
import { assertRolePermission } from "@/domain/auth/permissions";
import type { AutomationProvider } from "@/domain/automation/automation-provider";
import type { ProjectRepository } from "@/domain/projects/project-repository";
import {
  parseCreateSitemapPilotJobInput,
  parseSitemapPilotOutput,
  type SitemapPilotJob,
} from "@/domain/sitemap/sitemap-pilot";
import { parseSitemapStructure } from "@/domain/sitemap/sitemap-structure";
import type { SitemapPilotJobRepository } from "@/domain/sitemap/sitemap-pilot-repository";
import type { AiProviderId } from "@/domain/ai/ai-model-provider";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/domain/shared/app-error";

export interface SitemapPilotActor {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

export interface SitemapLivePolicy {
  allowedAiProviders: AiProviderId[];
  maxSites: number;
  requireCostConfirmation: boolean;
}

export class SitemapPilotService {
  constructor(
    private readonly jobs: SitemapPilotJobRepository,
    private readonly projects: ProjectRepository,
    private readonly provider: AutomationProvider,
    private readonly livePolicy?: SitemapLivePolicy,
  ) {}

  async create(
    actor: SitemapPilotActor,
    rawInput: unknown,
  ): Promise<SitemapPilotJob> {
    assertRolePermission(actor.role, "pipeline.run");
    const input = parseCreateSitemapPilotJobInput(rawInput);
    if (this.provider.id === "make" || this.provider.id === "app_native") {
      if (!this.livePolicy) {
        throw new ValidationError(
          "SITEMAP_LIVE_POLICY_MISSING",
          "Pilot Make chưa có chính sách canary phía server.",
        );
      }
      if (!this.livePolicy.allowedAiProviders.includes(input.ai.provider)) {
        throw new ValidationError(
          "SITEMAP_AI_PROVIDER_NOT_ALLOWED",
          "AI provider chưa được allowlist cho canary Module 1.",
          { provider: input.ai.provider },
        );
      }
      if (input.sites.length > this.livePolicy.maxSites) {
        throw new ValidationError(
          "SITEMAP_CANARY_SITE_LIMIT_EXCEEDED",
          `Canary hiện chỉ cho phép tối đa ${this.livePolicy.maxSites} website.`,
        );
      }
    }
    const project = await this.projects.getById(actor.workspaceId, input.projectId);
    if (!project) {
      throw new NotFoundError(
        "PROJECT_NOT_FOUND",
        "Không tìm thấy dự án trong workspace hiện tại.",
        { projectId: input.projectId },
      );
    }
    if (project.status !== "active") {
      throw new ValidationError(
        "PROJECT_ARCHIVED",
        "Không thể chạy Sitemap cho dự án đã lưu trữ.",
      );
    }

    const created = await this.jobs.create({
      id: randomUUID(),
      workspaceId: actor.workspaceId,
      input,
      now: new Date(),
    });
    if (!created.created) {
      if (JSON.stringify(created.job.input) !== JSON.stringify(input)) {
        throw new ConflictError(
          "IDEMPOTENCY_KEY_REUSED",
          "Khóa chống chạy trùng đã được dùng cho một payload khác.",
          { idempotencyKey: input.idempotencyKey },
        );
      }
      return created.job;
    }

    const dispatching = await this.jobs.setStatus(
      actor.workspaceId,
      created.job.id,
      "dispatching",
      new Date(),
      { incrementAttempt: true },
    );

    try {
      const result = await this.provider.trigger(
        dispatching.id,
        "module-1-sitemap",
        "RIS_SITEMAP",
        input,
      );
      if (result.status === "success") {
        const output = parseSitemapPilotOutput(result.outputData);
        return this.jobs.setStatus(
          actor.workspaceId,
          dispatching.id,
          "succeeded",
          new Date(),
          { output },
        );
      }
      if (result.status === "failure") {
        return this.jobs.setStatus(
          actor.workspaceId,
          dispatching.id,
          "failed",
          new Date(),
          {
            errorCode: "AUTOMATION_REJECTED",
            errorMessage: result.errorMessage ?? "Make không nhận job Sitemap.",
          },
        );
      }

      // Make sẽ claim và cập nhật trực tiếp bản ghi Neon. Không cập nhật lại
      // thành running ở đây để tránh ghi đè một kết quả đã hoàn thành rất nhanh.
      return dispatching;
    } catch (error) {
      return this.jobs.setStatus(
        actor.workspaceId,
        dispatching.id,
        "failed",
        new Date(),
        {
          errorCode:
            error instanceof Error && "code" in error
              ? String(error.code)
              : "AUTOMATION_DISPATCH_FAILED",
          errorMessage:
            error instanceof Error
              ? error.message
              : "Không thể gửi job Sitemap.",
        },
      );
    }
  }

  // Sửa & lưu lại sitemap đã chọn (người dùng thêm/xóa/sửa nhãn) → ghi output
  // mới + tính lại cây structure cho sơ đồ. Chỉ sửa được run đã hoàn thành.
  async updateSitemap(
    actor: SitemapPilotActor,
    jobId: string,
    selectedSitemap: string,
  ): Promise<SitemapPilotJob> {
    assertRolePermission(actor.role, "pipeline.run");
    const job = await this.jobs.getById(actor.workspaceId, jobId);
    if (!job) {
      throw new NotFoundError(
        "SITEMAP_JOB_NOT_FOUND",
        "Không tìm thấy job Sitemap trong workspace hiện tại.",
        { jobId },
      );
    }
    if (job.status !== "succeeded" || !job.output) {
      throw new ValidationError(
        "SITEMAP_JOB_NOT_EDITABLE",
        "Chỉ có thể sửa kết quả đã hoàn thành.",
      );
    }
    const cleaned = selectedSitemap.replace(/\r\n/g, "\n").trim();
    if (!cleaned) {
      throw new ValidationError(
        "SITEMAP_EMPTY",
        "Sitemap không được để trống.",
      );
    }
    const sites = job.output.sites.map((site, index) =>
      index === 0
        ? {
            ...site,
            selectedSitemap: cleaned,
            structure: parseSitemapStructure(cleaned, site.reference),
          }
        : site,
    );
    return this.jobs.setStatus(actor.workspaceId, jobId, "succeeded", new Date(), {
      output: { ...job.output, sites },
    });
  }

  // Lịch sử run của dự án — cho dropdown preset input + xem lại output.
  async listHistory(
    actor: SitemapPilotActor,
    projectId: string,
    limit = 10,
  ): Promise<SitemapPilotJob[]> {
    assertRolePermission(actor.role, "workspace.read");
    return this.jobs.listRecentForProject(
      actor.workspaceId,
      projectId,
      Math.min(Math.max(limit, 1), 25),
    );
  }

  async get(
    actor: SitemapPilotActor,
    jobId: string,
  ): Promise<SitemapPilotJob> {
    assertRolePermission(actor.role, "workspace.read");
    const job = await this.jobs.getById(actor.workspaceId, jobId);
    if (!job) {
      throw new NotFoundError(
        "SITEMAP_JOB_NOT_FOUND",
        "Không tìm thấy job Sitemap trong workspace hiện tại.",
        { jobId },
      );
    }
    // Sweeper "lười": job không kết thúc mà quá hạn → timed_out để UI không treo.
    const STALE_MS = 15 * 60_000;
    const terminal = ["succeeded", "failed", "timed_out"].includes(job.status);
    if (!terminal && Date.now() - job.updatedAt.getTime() >= STALE_MS) {
      return this.jobs.setStatus(
        actor.workspaceId,
        job.id,
        "timed_out",
        new Date(),
        {
          errorCode: "SITEMAP_JOB_STALE",
          errorMessage:
            "Job quá thời gian xử lý. Hãy chạy lại — input đã lưu trong Presets.",
        },
      );
    }
    return job;
  }
}

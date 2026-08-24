import { randomUUID } from "node:crypto";
import type { WorkspaceRole } from "@/domain/auth/permissions";
import { assertRolePermission } from "@/domain/auth/permissions";
import type { ProjectRepository } from "@/domain/projects/project-repository";
import {
  getModuleDefinition,
  parseModuleInput,
} from "@/domain/modules/module-definition";
import type { ModuleJob, ModuleJobBaseInput } from "@/domain/modules/module-job";
import type { ModuleJobRepository } from "@/domain/modules/module-job-repository";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/domain/shared/app-error";

export interface ModuleActor {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

export class ModuleJobService {
  constructor(
    private readonly jobs: ModuleJobRepository,
    private readonly projects: ProjectRepository,
  ) {}

  async create(
    actor: ModuleActor,
    moduleKey: string,
    rawInput: unknown,
  ): Promise<ModuleJob> {
    assertRolePermission(actor.role, "pipeline.run");
    const definition = getModuleDefinition(moduleKey);
    const input = parseModuleInput(definition, rawInput) as ModuleJobBaseInput &
      Record<string, unknown>;

    const project = await this.projects.getById(
      actor.workspaceId,
      input.projectId,
    );
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
        "Không thể chạy module cho dự án đã lưu trữ.",
      );
    }

    const created = await this.jobs.create({
      id: randomUUID(),
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      projectId: input.projectId,
      moduleKey: definition.key,
      idempotencyKey: input.idempotencyKey,
      input: input as Record<string, unknown>,
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
    }
    return created.job;
  }

  async get(actor: ModuleActor, jobId: string): Promise<ModuleJob> {
    assertRolePermission(actor.role, "workspace.read");
    const job = await this.jobs.getById(actor.workspaceId, jobId);
    if (!job) {
      throw new NotFoundError(
        "MODULE_JOB_NOT_FOUND",
        "Không tìm thấy job module trong workspace hiện tại.",
        { jobId },
      );
    }
    return this.sweepIfStale(job);
  }

  // Sweeper "lười" (hợp serverless, không cần cron): nếu job không ở trạng thái
  // kết thúc mà đã quá hạn (invocation chạy nền tối đa 300s + dư địa), chuyển
  // thành timed_out ngay khi được đọc — UI không bao giờ treo "đang xử lý" mãi.
  private async sweepIfStale(job: ModuleJob): Promise<ModuleJob> {
    const STALE_MS = 15 * 60_000;
    const terminal = ["succeeded", "failed", "timed_out"].includes(job.status);
    if (terminal || Date.now() - job.updatedAt.getTime() < STALE_MS) {
      return job;
    }
    return this.jobs.setStatus(
      job.workspaceId,
      job.id,
      "timed_out",
      new Date(),
      {
        errorCode: "MODULE_JOB_STALE",
        errorMessage:
          "Job quá thời gian xử lý (kẹt do lỗi hạ tầng hoặc phiên chạy bị ngắt). Hãy chạy lại — input đã lưu trong Presets.",
      },
    );
  }

  // Sửa & lưu lại đầu ra của một run (người dùng tinh chỉnh nội dung AI sinh).
  // Gộp các block đã sửa vào output cũ, giữ nguyên trạng thái succeeded.
  async updateOutput(
    actor: ModuleActor,
    jobId: string,
    edited: Record<string, unknown>,
  ): Promise<ModuleJob> {
    assertRolePermission(actor.role, "pipeline.run");
    const job = await this.jobs.getById(actor.workspaceId, jobId);
    if (!job) {
      throw new NotFoundError(
        "MODULE_JOB_NOT_FOUND",
        "Không tìm thấy job module trong workspace hiện tại.",
        { jobId },
      );
    }
    if (job.status !== "succeeded" || !job.output) {
      throw new ValidationError(
        "MODULE_JOB_NOT_EDITABLE",
        "Chỉ có thể sửa kết quả đã hoàn thành.",
      );
    }
    return this.jobs.setStatus(actor.workspaceId, jobId, "succeeded", new Date(), {
      output: { ...job.output, ...edited },
    });
  }

  // Job gần đây trên toàn workspace (mọi dự án + module) — cho bảng điều khiển.
  async listRecentActivity(
    actor: ModuleActor,
    limit = 12,
  ): Promise<ModuleJob[]> {
    assertRolePermission(actor.role, "workspace.read");
    return this.jobs.listRecentByWorkspace(
      actor.workspaceId,
      Math.min(Math.max(limit, 1), 50),
    );
  }

  // Lịch sử run gần nhất của module trong dự án (để hiển thị preset + ghim).
  async listHistory(
    actor: ModuleActor,
    projectId: string,
    moduleKey: string,
    limit = 10,
  ): Promise<ModuleJob[]> {
    assertRolePermission(actor.role, "workspace.read");
    return this.jobs.listRecentForModule(
      actor.workspaceId,
      projectId,
      moduleKey,
      Math.min(Math.max(limit, 1), 25),
    );
  }

  // Ghim một run thành công làm bản "chính thức" (nối luồng + preset dùng bản
  // này). jobId = null để bỏ ghim.
  async pin(
    actor: ModuleActor,
    moduleKey: string,
    jobId: string | null,
    projectId?: string,
  ): Promise<void> {
    assertRolePermission(actor.role, "pipeline.run");
    if (jobId) {
      const job = await this.jobs.getById(actor.workspaceId, jobId);
      if (!job || job.moduleKey !== moduleKey) {
        throw new NotFoundError(
          "MODULE_JOB_NOT_FOUND",
          "Không tìm thấy job module trong workspace hiện tại.",
          { jobId },
        );
      }
      if (job.status !== "succeeded") {
        throw new ValidationError(
          "MODULE_JOB_NOT_SUCCEEDED",
          "Chỉ có thể ghim một lần chạy đã hoàn thành.",
        );
      }
      await this.jobs.setPinned(
        actor.workspaceId,
        job.projectId,
        moduleKey,
        jobId,
        new Date(),
      );
      return;
    }
    if (!projectId) {
      throw new ValidationError(
        "PROJECT_ID_REQUIRED",
        "Thiếu projectId để bỏ ghim.",
      );
    }
    await this.jobs.setPinned(
      actor.workspaceId,
      projectId,
      moduleKey,
      null,
      new Date(),
    );
  }

  // Ngữ cảnh dự án cho một module: bối cảnh chung (điền 1 lần, tái dùng), input
  // gần nhất của module (khôi phục khi reload), và danh sách module đã có kết quả
  // (để hiển thị "sẽ tự dùng kết quả Module X").
  async getContext(
    actor: ModuleActor,
    projectId: string,
    moduleKey: string,
  ): Promise<{
    sharedContext: {
      language?: string;
      location?: string;
      audienceBrief?: string;
      tone?: string;
    } | null;
    moduleInput: Record<string, unknown> | null;
    upstream: string[];
  }> {
    assertRolePermission(actor.role, "workspace.read");
    const latestForModule = await this.jobs.getLatestForModule(
      actor.workspaceId,
      projectId,
      moduleKey,
    );
    const succeeded = await this.jobs.listLatestSucceededByProject(
      actor.workspaceId,
      projectId,
    );
    const newestInput = [latestForModule, ...succeeded]
      .filter((job): job is ModuleJob => job !== null)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]?.input;
    return {
      sharedContext: newestInput ? pickSharedContext(newestInput) : null,
      moduleInput: latestForModule?.input ?? null,
      upstream: succeeded.map((job) => job.moduleKey),
    };
  }
}

function pickSharedContext(input: Record<string, unknown>): {
  language?: string;
  location?: string;
  audienceBrief?: string;
  tone?: string;
} {
  const result: Record<string, string> = {};
  for (const key of ["language", "location", "audienceBrief", "tone"]) {
    const value = input[key];
    if (typeof value === "string" && value.length > 0) result[key] = value;
  }
  return result;
}

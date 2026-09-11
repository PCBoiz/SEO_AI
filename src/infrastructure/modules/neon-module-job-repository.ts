import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type {
  ModuleJob,
  ModuleJobStatus,
} from "@/domain/modules/module-job";
import type {
  CreateModuleJobResult,
  ModuleJobRepository,
  NewModuleJob,
  SetModuleJobStatusOptions,
} from "@/domain/modules/module-job-repository";
import { NotFoundError } from "@/domain/shared/app-error";
import type { NeonApplicationDatabase } from "@/infrastructure/database/neon-adapter";
import { pgModuleJobs } from "@/lib/db/postgres-schema";

export class NeonModuleJobRepository implements ModuleJobRepository {
  constructor(private readonly database: NeonApplicationDatabase) {}

  async create(input: NewModuleJob): Promise<CreateModuleJobResult> {
    const inserted = await this.database
      .insert(pgModuleJobs)
      .values({
        id: input.id,
        workspaceId: input.workspaceId,
        userId: input.userId,
        projectId: input.projectId,
        moduleKey: input.moduleKey,
        idempotencyKey: input.idempotencyKey,
        status: "queued",
        inputPayload: input.input,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .onConflictDoNothing({
        target: [
          pgModuleJobs.workspaceId,
          pgModuleJobs.moduleKey,
          pgModuleJobs.idempotencyKey,
        ],
      })
      .returning();

    const job = inserted[0]
      ? mapRow(inserted[0])
      : await this.getByIdempotencyKey(
          input.workspaceId,
          input.moduleKey,
          input.idempotencyKey,
        );
    if (!job) throw new Error("Không thể đọc lại job module trên Neon sau khi tạo.");
    return { job, created: inserted.length === 1 };
  }

  async getById(
    workspaceId: string,
    jobId: string,
  ): Promise<ModuleJob | null> {
    const rows = await this.database
      .select()
      .from(pgModuleJobs)
      .where(
        and(
          eq(pgModuleJobs.workspaceId, workspaceId),
          eq(pgModuleJobs.id, jobId),
        ),
      )
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async setStatus(
    workspaceId: string,
    jobId: string,
    status: ModuleJobStatus,
    now: Date,
    options: SetModuleJobStatusOptions = {},
  ): Promise<ModuleJob> {
    const terminal = ["succeeded", "failed", "timed_out"].includes(status);
    const rows = await this.database
      .update(pgModuleJobs)
      .set({
        status,
        outputPayload: options.output,
        errorCode: options.errorCode ?? null,
        errorMessage: options.errorMessage ?? null,
        attemptCount: options.incrementAttempt
          ? sql`${pgModuleJobs.attemptCount} + 1`
          : undefined,
        version: sql`${pgModuleJobs.version} + 1`,
        updatedAt: now,
        startedAt:
          status === "dispatching" || status === "running" ? now : undefined,
        completedAt: terminal ? now : undefined,
      })
      .where(
        and(
          eq(pgModuleJobs.workspaceId, workspaceId),
          eq(pgModuleJobs.id, jobId),
        ),
      )
      .returning();
    if (!rows[0]) throw jobNotFound(jobId);
    return mapRow(rows[0]);
  }

  async getLatestForModule(
    workspaceId: string,
    projectId: string,
    moduleKey: string,
  ): Promise<ModuleJob | null> {
    const rows = await this.database
      .select()
      .from(pgModuleJobs)
      .where(
        and(
          eq(pgModuleJobs.workspaceId, workspaceId),
          eq(pgModuleJobs.projectId, projectId),
          eq(pgModuleJobs.moduleKey, moduleKey),
        ),
      )
      .orderBy(desc(pgModuleJobs.createdAt));
    const jobs = rows.map(mapRow);
    return jobs.find((job) => job.pinnedAt !== null) ?? jobs[0] ?? null;
  }

  async listLatestSucceededByProject(
    workspaceId: string,
    projectId: string,
  ): Promise<ModuleJob[]> {
    const rows = await this.database
      .select()
      .from(pgModuleJobs)
      .where(
        and(
          eq(pgModuleJobs.workspaceId, workspaceId),
          eq(pgModuleJobs.projectId, projectId),
          eq(pgModuleJobs.status, "succeeded"),
        ),
      )
      .orderBy(desc(pgModuleJobs.createdAt));
    return officialPerModule(rows.map(mapRow));
  }

  async listByIdempotencyKeys(
    workspaceId: string,
    projectId: string,
    keys: readonly string[],
  ): Promise<ModuleJob[]> {
    if (keys.length === 0) return [];
    const rows = await this.database
      .select()
      .from(pgModuleJobs)
      .where(
        and(
          eq(pgModuleJobs.workspaceId, workspaceId),
          eq(pgModuleJobs.projectId, projectId),
          inArray(pgModuleJobs.idempotencyKey, [...keys]),
        ),
      );
    return rows.map(mapRow);
  }

  async listRecentForModule(
    workspaceId: string,
    projectId: string,
    moduleKey: string,
    limit: number,
  ): Promise<ModuleJob[]> {
    const rows = await this.database
      .select()
      .from(pgModuleJobs)
      .where(
        and(
          eq(pgModuleJobs.workspaceId, workspaceId),
          eq(pgModuleJobs.projectId, projectId),
          eq(pgModuleJobs.moduleKey, moduleKey),
        ),
      )
      .orderBy(desc(pgModuleJobs.createdAt))
      .limit(limit);
    return rows.map(mapRow);
  }

  async listRecentByWorkspace(
    workspaceId: string,
    limit: number,
  ): Promise<ModuleJob[]> {
    const rows = await this.database
      .select()
      .from(pgModuleJobs)
      .where(eq(pgModuleJobs.workspaceId, workspaceId))
      .orderBy(desc(pgModuleJobs.createdAt))
      .limit(limit);
    return rows.map(mapRow);
  }

  async setPinned(
    workspaceId: string,
    projectId: string,
    moduleKey: string,
    jobId: string | null,
    now: Date,
  ): Promise<void> {
    // Bỏ ghim toàn bộ job của module trong dự án trước, rồi ghim job được chọn.
    await this.database
      .update(pgModuleJobs)
      .set({ pinnedAt: null, updatedAt: now })
      .where(
        and(
          eq(pgModuleJobs.workspaceId, workspaceId),
          eq(pgModuleJobs.projectId, projectId),
          eq(pgModuleJobs.moduleKey, moduleKey),
        ),
      );
    if (!jobId) return;
    await this.database
      .update(pgModuleJobs)
      .set({ pinnedAt: now, updatedAt: now })
      .where(
        and(
          eq(pgModuleJobs.workspaceId, workspaceId),
          eq(pgModuleJobs.id, jobId),
        ),
      );
  }

  private async getByIdempotencyKey(
    workspaceId: string,
    moduleKey: string,
    idempotencyKey: string,
  ): Promise<ModuleJob | null> {
    const rows = await this.database
      .select()
      .from(pgModuleJobs)
      .where(
        and(
          eq(pgModuleJobs.workspaceId, workspaceId),
          eq(pgModuleJobs.moduleKey, moduleKey),
          eq(pgModuleJobs.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }
}

// Từ danh sách job thành công đã sắp xếp mới→cũ, chọn bản "chính thức" của mỗi
// module: bản được ghim nếu có, không thì bản mới nhất.
function officialPerModule(jobs: ModuleJob[]): ModuleJob[] {
  const byModule = new Map<string, ModuleJob>();
  for (const job of jobs) {
    const current = byModule.get(job.moduleKey);
    if (!current) {
      byModule.set(job.moduleKey, job);
      continue;
    }
    if (job.pinnedAt !== null && current.pinnedAt === null) {
      byModule.set(job.moduleKey, job);
    }
  }
  return [...byModule.values()];
}

function mapRow(row: typeof pgModuleJobs.$inferSelect): ModuleJob {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    projectId: row.projectId,
    moduleKey: row.moduleKey,
    idempotencyKey: row.idempotencyKey,
    status: row.status,
    input: row.inputPayload,
    output: row.outputPayload ?? null,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    attemptCount: row.attemptCount,
    version: row.version,
    pinnedAt: row.pinnedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

function jobNotFound(jobId: string): NotFoundError {
  return new NotFoundError(
    "MODULE_JOB_NOT_FOUND",
    "Không tìm thấy job module trong workspace hiện tại.",
    { jobId },
  );
}

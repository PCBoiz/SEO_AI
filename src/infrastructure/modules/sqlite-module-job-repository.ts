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
import type { ApplicationDatabase } from "@/infrastructure/database/sqlite-adapter";
import { moduleJobs } from "@/lib/db/schema";

export class SqliteModuleJobRepository implements ModuleJobRepository {
  constructor(private readonly database: ApplicationDatabase) {}

  async create(input: NewModuleJob): Promise<CreateModuleJobResult> {
    const insert = this.database
      .insert(moduleJobs)
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
          moduleJobs.workspaceId,
          moduleJobs.moduleKey,
          moduleJobs.idempotencyKey,
        ],
      })
      .run();

    const job =
      insert.changes === 1
        ? await this.getById(input.workspaceId, input.id)
        : await this.getByIdempotencyKey(
            input.workspaceId,
            input.moduleKey,
            input.idempotencyKey,
          );
    if (!job) throw new Error("Không thể đọc lại job module sau khi tạo.");
    return { job, created: insert.changes === 1 };
  }

  async getById(
    workspaceId: string,
    jobId: string,
  ): Promise<ModuleJob | null> {
    const rows = await this.database
      .select()
      .from(moduleJobs)
      .where(
        and(eq(moduleJobs.workspaceId, workspaceId), eq(moduleJobs.id, jobId)),
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
    const result = this.database
      .update(moduleJobs)
      .set({
        status,
        outputPayload: options.output,
        errorCode: options.errorCode ?? null,
        errorMessage: options.errorMessage ?? null,
        attemptCount: options.incrementAttempt
          ? sql`${moduleJobs.attemptCount} + 1`
          : undefined,
        version: sql`${moduleJobs.version} + 1`,
        updatedAt: now,
        startedAt:
          status === "dispatching" || status === "running" ? now : undefined,
        completedAt: terminal ? now : undefined,
      })
      .where(
        and(eq(moduleJobs.workspaceId, workspaceId), eq(moduleJobs.id, jobId)),
      )
      .run();
    if (result.changes !== 1) throw jobNotFound(jobId);
    const job = await this.getById(workspaceId, jobId);
    if (!job) throw jobNotFound(jobId);
    return job;
  }

  async getLatestForModule(
    workspaceId: string,
    projectId: string,
    moduleKey: string,
  ): Promise<ModuleJob | null> {
    const rows = await this.database
      .select()
      .from(moduleJobs)
      .where(
        and(
          eq(moduleJobs.workspaceId, workspaceId),
          eq(moduleJobs.projectId, projectId),
          eq(moduleJobs.moduleKey, moduleKey),
        ),
      )
      .orderBy(desc(moduleJobs.createdAt));
    const jobs = rows.map(mapRow);
    return jobs.find((job) => job.pinnedAt !== null) ?? jobs[0] ?? null;
  }

  async listLatestSucceededByProject(
    workspaceId: string,
    projectId: string,
  ): Promise<ModuleJob[]> {
    const rows = await this.database
      .select()
      .from(moduleJobs)
      .where(
        and(
          eq(moduleJobs.workspaceId, workspaceId),
          eq(moduleJobs.projectId, projectId),
          eq(moduleJobs.status, "succeeded"),
        ),
      )
      .orderBy(desc(moduleJobs.createdAt));
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
      .from(moduleJobs)
      .where(
        and(
          eq(moduleJobs.workspaceId, workspaceId),
          eq(moduleJobs.projectId, projectId),
          inArray(moduleJobs.idempotencyKey, [...keys]),
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
      .from(moduleJobs)
      .where(
        and(
          eq(moduleJobs.workspaceId, workspaceId),
          eq(moduleJobs.projectId, projectId),
          eq(moduleJobs.moduleKey, moduleKey),
        ),
      )
      .orderBy(desc(moduleJobs.createdAt))
      .limit(limit);
    return rows.map(mapRow);
  }

  async listRecentByWorkspace(
    workspaceId: string,
    limit: number,
  ): Promise<ModuleJob[]> {
    const rows = await this.database
      .select()
      .from(moduleJobs)
      .where(eq(moduleJobs.workspaceId, workspaceId))
      .orderBy(desc(moduleJobs.createdAt))
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
    this.database
      .update(moduleJobs)
      .set({ pinnedAt: null, updatedAt: now })
      .where(
        and(
          eq(moduleJobs.workspaceId, workspaceId),
          eq(moduleJobs.projectId, projectId),
          eq(moduleJobs.moduleKey, moduleKey),
        ),
      )
      .run();
    if (!jobId) return;
    this.database
      .update(moduleJobs)
      .set({ pinnedAt: now, updatedAt: now })
      .where(
        and(
          eq(moduleJobs.workspaceId, workspaceId),
          eq(moduleJobs.id, jobId),
        ),
      )
      .run();
  }

  private async getByIdempotencyKey(
    workspaceId: string,
    moduleKey: string,
    idempotencyKey: string,
  ): Promise<ModuleJob | null> {
    const rows = await this.database
      .select()
      .from(moduleJobs)
      .where(
        and(
          eq(moduleJobs.workspaceId, workspaceId),
          eq(moduleJobs.moduleKey, moduleKey),
          eq(moduleJobs.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }
}

// Chọn bản "chính thức" của mỗi module: bản ghim nếu có, không thì bản mới nhất.
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

function mapRow(row: typeof moduleJobs.$inferSelect): ModuleJob {
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

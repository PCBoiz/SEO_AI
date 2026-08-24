import { and, desc, eq, sql } from "drizzle-orm";
import type {
  CreateSitemapPilotJobResult,
  NewSitemapPilotJob,
  SitemapPilotJobRepository,
} from "@/domain/sitemap/sitemap-pilot-repository";
import {
  parseCreateSitemapPilotJobInput,
  parseSitemapPilotOutput,
  type SitemapPilotJob,
  type SitemapPilotOutput,
  type SitemapPilotStatus,
} from "@/domain/sitemap/sitemap-pilot";
import { NotFoundError } from "@/domain/shared/app-error";
import type { ApplicationDatabase } from "@/infrastructure/database/sqlite-adapter";
import { sitemapPilotJobs } from "@/lib/db/schema";

export class SqliteSitemapPilotJobRepository
  implements SitemapPilotJobRepository
{
  constructor(private readonly database: ApplicationDatabase) {}

  async create(
    input: NewSitemapPilotJob,
  ): Promise<CreateSitemapPilotJobResult> {
    const insert = this.database
      .insert(sitemapPilotJobs)
      .values({
        id: input.id,
        workspaceId: input.workspaceId,
        projectId: input.input.projectId,
        automationKey: "RIS_SITEMAP",
        idempotencyKey: input.input.idempotencyKey,
        status: "queued",
        inputPayload: input.input,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .onConflictDoNothing({
        target: [
          sitemapPilotJobs.workspaceId,
          sitemapPilotJobs.automationKey,
          sitemapPilotJobs.idempotencyKey,
        ],
      })
      .run();

    const job =
      insert.changes === 1
        ? await this.getById(input.workspaceId, input.id)
        : await this.getByIdempotencyKey(
            input.workspaceId,
            input.input.idempotencyKey,
          );
    if (!job) {
      throw new Error("Không thể đọc lại job Sitemap sau khi tạo.");
    }
    return { job, created: insert.changes === 1 };
  }

  async getById(
    workspaceId: string,
    jobId: string,
  ): Promise<SitemapPilotJob | null> {
    const rows = await this.database
      .select()
      .from(sitemapPilotJobs)
      .where(
        and(
          eq(sitemapPilotJobs.workspaceId, workspaceId),
          eq(sitemapPilotJobs.id, jobId),
        ),
      )
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async listRecentForProject(
    workspaceId: string,
    projectId: string,
    limit: number,
  ): Promise<SitemapPilotJob[]> {
    const rows = await this.database
      .select()
      .from(sitemapPilotJobs)
      .where(
        and(
          eq(sitemapPilotJobs.workspaceId, workspaceId),
          eq(sitemapPilotJobs.projectId, projectId),
        ),
      )
      .orderBy(desc(sitemapPilotJobs.createdAt))
      .limit(limit);
    return rows.map(mapRow);
  }

  async setStatus(
    workspaceId: string,
    jobId: string,
    status: SitemapPilotStatus,
    now: Date,
    options: {
      output?: SitemapPilotOutput;
      errorCode?: string;
      errorMessage?: string;
      incrementAttempt?: boolean;
    } = {},
  ): Promise<SitemapPilotJob> {
    const terminal = ["succeeded", "failed", "timed_out"].includes(status);
    const result = this.database
      .update(sitemapPilotJobs)
      .set({
        status,
        outputPayload: options.output,
        errorCode: options.errorCode ?? null,
        errorMessage: options.errorMessage ?? null,
        attemptCount: options.incrementAttempt
          ? sql`${sitemapPilotJobs.attemptCount} + 1`
          : undefined,
        version: sql`${sitemapPilotJobs.version} + 1`,
        updatedAt: now,
        startedAt:
          status === "dispatching" || status === "running" ? now : undefined,
        completedAt: terminal ? now : undefined,
      })
      .where(
        and(
          eq(sitemapPilotJobs.workspaceId, workspaceId),
          eq(sitemapPilotJobs.id, jobId),
        ),
      )
      .run();
    if (result.changes !== 1) {
      throw jobNotFound(jobId);
    }
    const job = await this.getById(workspaceId, jobId);
    if (!job) throw jobNotFound(jobId);
    return job;
  }

  private async getByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<SitemapPilotJob | null> {
    const rows = await this.database
      .select()
      .from(sitemapPilotJobs)
      .where(
        and(
          eq(sitemapPilotJobs.workspaceId, workspaceId),
          eq(sitemapPilotJobs.automationKey, "RIS_SITEMAP"),
          eq(sitemapPilotJobs.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }
}

function mapRow(row: typeof sitemapPilotJobs.$inferSelect): SitemapPilotJob {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    automationKey: row.automationKey,
    idempotencyKey: row.idempotencyKey,
    status: row.status,
    input: parseCreateSitemapPilotJobInput(row.inputPayload),
    output: row.outputPayload
      ? parseSitemapPilotOutput(row.outputPayload)
      : null,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    attemptCount: row.attemptCount,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

function jobNotFound(jobId: string): NotFoundError {
  return new NotFoundError(
    "SITEMAP_JOB_NOT_FOUND",
    "Không tìm thấy job Sitemap trong workspace hiện tại.",
    { jobId },
  );
}

import { neon } from "@neondatabase/serverless";
import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import type {
  CreateSitemapPilotJobResult,
  NewSitemapPilotJob,
  SitemapPilotJobRepository,
} from "@/domain/sitemap/sitemap-pilot-repository";
import {
  parseCreateSitemapPilotJobInput,
  parseStoredSitemapPilotOutput,
  type SitemapPilotJob,
  type SitemapPilotOutput,
  type SitemapPilotStatus,
} from "@/domain/sitemap/sitemap-pilot";
import { NotFoundError } from "@/domain/shared/app-error";
import { sitemapPilotBridgeJobs } from "@/lib/db/bridge-schema";

export class NeonSitemapPilotJobRepository
  implements SitemapPilotJobRepository
{
  private readonly database;

  constructor(databaseUrl: string) {
    this.database = drizzle(neon(databaseUrl), {
      schema: { sitemapPilotBridgeJobs },
    });
  }

  async create(
    input: NewSitemapPilotJob,
  ): Promise<CreateSitemapPilotJobResult> {
    const inserted = await this.database
      .insert(sitemapPilotBridgeJobs)
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
          sitemapPilotBridgeJobs.workspaceId,
          sitemapPilotBridgeJobs.automationKey,
          sitemapPilotBridgeJobs.idempotencyKey,
        ],
      })
      .returning();

    const job = inserted[0]
      ? mapRow(inserted[0])
      : await this.getByIdempotencyKey(
          input.workspaceId,
          input.input.idempotencyKey,
        );
    if (!job) {
      throw new Error("Không thể đọc lại job Sitemap trên Neon sau khi tạo.");
    }
    return { job, created: inserted.length === 1 };
  }

  async getById(
    workspaceId: string,
    jobId: string,
  ): Promise<SitemapPilotJob | null> {
    const rows = await this.database
      .select()
      .from(sitemapPilotBridgeJobs)
      .where(
        and(
          eq(sitemapPilotBridgeJobs.workspaceId, workspaceId),
          eq(sitemapPilotBridgeJobs.id, jobId),
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
      .from(sitemapPilotBridgeJobs)
      .where(
        and(
          eq(sitemapPilotBridgeJobs.workspaceId, workspaceId),
          eq(sitemapPilotBridgeJobs.projectId, projectId),
        ),
      )
      .orderBy(desc(sitemapPilotBridgeJobs.createdAt))
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
    const rows = await this.database
      .update(sitemapPilotBridgeJobs)
      .set({
        status,
        outputPayload: options.output,
        errorCode: options.errorCode ?? null,
        errorMessage: options.errorMessage ?? null,
        attemptCount: options.incrementAttempt
          ? sql`${sitemapPilotBridgeJobs.attemptCount} + 1`
          : undefined,
        version: sql`${sitemapPilotBridgeJobs.version} + 1`,
        updatedAt: now,
        startedAt:
          status === "dispatching" || status === "running" ? now : undefined,
        completedAt: terminal ? now : undefined,
      })
      .where(
        and(
          eq(sitemapPilotBridgeJobs.workspaceId, workspaceId),
          eq(sitemapPilotBridgeJobs.id, jobId),
        ),
      )
      .returning();
    if (!rows[0]) throw jobNotFound(jobId);
    return mapRow(rows[0]);
  }

  private async getByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<SitemapPilotJob | null> {
    const rows = await this.database
      .select()
      .from(sitemapPilotBridgeJobs)
      .where(
        and(
          eq(sitemapPilotBridgeJobs.workspaceId, workspaceId),
          eq(sitemapPilotBridgeJobs.automationKey, "RIS_SITEMAP"),
          eq(sitemapPilotBridgeJobs.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }
}

function mapRow(row: typeof sitemapPilotBridgeJobs.$inferSelect): SitemapPilotJob {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    automationKey: "RIS_SITEMAP",
    idempotencyKey: row.idempotencyKey,
    status: row.status as SitemapPilotStatus,
    input: parseCreateSitemapPilotJobInput(row.inputPayload),
    output: parseStoredSitemapPilotOutput(row.outputPayload),
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

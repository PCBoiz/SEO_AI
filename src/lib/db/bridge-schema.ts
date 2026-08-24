import {
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

type JsonObject = Record<string, unknown>;

export const antigravityBridge = pgSchema("antigravity_bridge");

export const sitemapPilotBridgeJobs = antigravityBridge.table(
  "sitemap_jobs",
  {
    id: uuid("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    projectId: text("project_id").notNull(),
    automationKey: text("automation_key").notNull().default("RIS_SITEMAP"),
    idempotencyKey: uuid("idempotency_key").notNull(),
    status: text("status").notNull().default("queued"),
    inputPayload: jsonb("input_payload").$type<JsonObject>().notNull(),
    outputPayload: jsonb("output_payload").$type<JsonObject>(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    attemptCount: integer("attempt_count").notNull().default(0),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("sitemap_jobs_workspace_idempotency_unique").on(
      table.workspaceId,
      table.automationKey,
      table.idempotencyKey,
    ),
    index("sitemap_jobs_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    index("sitemap_jobs_project_id_idx").on(table.projectId),
    check(
      "sitemap_jobs_automation_key_check",
      sql`${table.automationKey} = 'RIS_SITEMAP'`,
    ),
    check(
      "sitemap_jobs_status_check",
      sql`${table.status} in ('queued', 'dispatching', 'running', 'succeeded', 'failed', 'timed_out')`,
    ),
    check("sitemap_jobs_attempt_count_check", sql`${table.attemptCount} >= 0`),
    check("sitemap_jobs_version_check", sql`${table.version} >= 1`),
  ],
);

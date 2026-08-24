CREATE SCHEMA "antigravity_bridge";
--> statement-breakpoint
CREATE TABLE "antigravity_bridge"."sitemap_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text NOT NULL,
	"automation_key" text DEFAULT 'RIS_SITEMAP' NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"input_payload" jsonb NOT NULL,
	"output_payload" jsonb,
	"error_code" text,
	"error_message" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "sitemap_jobs_automation_key_check" CHECK ("antigravity_bridge"."sitemap_jobs"."automation_key" = 'RIS_SITEMAP'),
	CONSTRAINT "sitemap_jobs_status_check" CHECK ("antigravity_bridge"."sitemap_jobs"."status" in ('queued', 'dispatching', 'running', 'succeeded', 'failed', 'timed_out')),
	CONSTRAINT "sitemap_jobs_attempt_count_check" CHECK ("antigravity_bridge"."sitemap_jobs"."attempt_count" >= 0),
	CONSTRAINT "sitemap_jobs_version_check" CHECK ("antigravity_bridge"."sitemap_jobs"."version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sitemap_jobs_workspace_idempotency_unique" ON "antigravity_bridge"."sitemap_jobs" USING btree ("workspace_id","automation_key","idempotency_key");--> statement-breakpoint
CREATE INDEX "sitemap_jobs_workspace_status_idx" ON "antigravity_bridge"."sitemap_jobs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "sitemap_jobs_project_id_idx" ON "antigravity_bridge"."sitemap_jobs" USING btree ("project_id");
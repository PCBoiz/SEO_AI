CREATE TABLE "module_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"module_key" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"input_payload" jsonb NOT NULL,
	"output_payload" jsonb,
	"error_code" text,
	"error_message" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "module_jobs_workspace_module_idempotency_unique" ON "module_jobs" USING btree ("workspace_id","module_key","idempotency_key");--> statement-breakpoint
CREATE INDEX "module_jobs_workspace_status_idx" ON "module_jobs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "module_jobs_project_id_idx" ON "module_jobs" USING btree ("project_id");
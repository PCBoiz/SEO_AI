CREATE TABLE `module_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`module_key` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`input_payload` text NOT NULL,
	`output_payload` text,
	`error_code` text,
	`error_message` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`started_at` integer,
	`completed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `module_jobs_workspace_module_idempotency_unique` ON `module_jobs` (`workspace_id`,`module_key`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `module_jobs_workspace_status_idx` ON `module_jobs` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `module_jobs_project_id_idx` ON `module_jobs` (`project_id`);
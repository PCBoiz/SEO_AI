CREATE TABLE `sitemap_pilot_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`automation_key` text DEFAULT 'RIS_SITEMAP' NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text NOT NULL,
	`input_payload` text NOT NULL,
	`output_payload` text,
	`error_code` text,
	`error_message` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sitemap_pilot_jobs_workspace_idempotency_unique` ON `sitemap_pilot_jobs` (`workspace_id`,`automation_key`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `sitemap_pilot_jobs_workspace_status_idx` ON `sitemap_pilot_jobs` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `sitemap_pilot_jobs_project_id_idx` ON `sitemap_pilot_jobs` (`project_id`);
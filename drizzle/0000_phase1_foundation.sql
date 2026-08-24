CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`output_id` text,
	`storage_provider` text NOT NULL,
	`bucket` text NOT NULL,
	`storage_key` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer,
	`checksum` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`output_id`) REFERENCES `content_outputs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_storage_key_unique` ON `assets` (`storage_provider`,`bucket`,`storage_key`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`user_id` text,
	`action` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`details` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_logs_workspace_timestamp_idx` ON `audit_logs` (`workspace_id`,`timestamp`);--> statement-breakpoint
CREATE TABLE `automation_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`capability_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text NOT NULL,
	`provider` text NOT NULL,
	`provider_key` text NOT NULL,
	`completion_mode` text NOT NULL,
	`category` text NOT NULL,
	`inputs_schema` text NOT NULL,
	`outputs_schema` text NOT NULL,
	`timeout` integer DEFAULT 600 NOT NULL,
	`retry` integer DEFAULT 3 NOT NULL,
	`estimated_duration` integer,
	`cost` integer,
	`execution_mode` text DEFAULT 'async' NOT NULL,
	`status` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`tags` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`capability_id`) REFERENCES `capabilities`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automation_registry_provider_key_unique` ON `automation_registry` (`provider_key`);--> statement-breakpoint
CREATE INDEX `automation_registry_capability_id_idx` ON `automation_registry` (`capability_id`);--> statement-breakpoint
CREATE TABLE `capabilities` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `capabilities_key_unique` ON `capabilities` (`key`);--> statement-breakpoint
CREATE TABLE `competitors` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`domain` text NOT NULL,
	`title` text,
	`notes` text,
	`priority` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `competitors_project_domain_unique` ON `competitors` (`project_id`,`domain`);--> statement-breakpoint
CREATE INDEX `competitors_project_id_idx` ON `competitors` (`project_id`);--> statement-breakpoint
CREATE TABLE `content_outputs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`job_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`latest_version` integer DEFAULT 1 NOT NULL,
	`wordpress_post_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `content_outputs_project_id_idx` ON `content_outputs` (`project_id`);--> statement-breakpoint
CREATE TABLE `content_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`content_output_id` text NOT NULL,
	`version` integer NOT NULL,
	`content_markdown` text,
	`content_html` text,
	`seo_score` integer,
	`word_count` integer,
	`tokens_used` integer,
	`reading_time` integer,
	`metadata` text,
	`created_at` integer NOT NULL,
	`created_by` text,
	FOREIGN KEY (`content_output_id`) REFERENCES `content_outputs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_revisions_output_version_unique` ON `content_revisions` (`content_output_id`,`version`);--> statement-breakpoint
CREATE TABLE `feature_flags` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`key` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`config` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feature_flags_workspace_key_unique` ON `feature_flags` (`workspace_id`,`key`);--> statement-breakpoint
CREATE TABLE `job_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`node_id` text,
	`event_id` text,
	`timestamp` integer NOT NULL,
	`level` text NOT NULL,
	`message` text NOT NULL,
	`context` text,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_logs_job_id_timestamp_idx` ON `job_logs` (`job_id`,`timestamp`);--> statement-breakpoint
CREATE TABLE `job_node_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`node_id` text NOT NULL,
	`automation_id` text NOT NULL,
	`status` text NOT NULL,
	`attempt` integer DEFAULT 0 NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`duration_seconds` integer,
	`tokens_used` integer,
	`input_data` text,
	`output_data` text,
	`error_code` text,
	`error_message` text,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`automation_id`) REFERENCES `automation_registry`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_node_statuses_job_node_unique` ON `job_node_statuses` (`job_id`,`node_id`);--> statement-breakpoint
CREATE INDEX `job_node_statuses_job_id_idx` ON `job_node_statuses` (`job_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`pipeline_id` text NOT NULL,
	`project_id` text NOT NULL,
	`publish_status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`updated_at` integer NOT NULL,
	`error_code` text,
	`error_message` text,
	FOREIGN KEY (`pipeline_id`) REFERENCES `pipelines`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `jobs_pipeline_id_idx` ON `jobs` (`pipeline_id`);--> statement-breakpoint
CREATE INDEX `jobs_project_id_idx` ON `jobs` (`project_id`);--> statement-breakpoint
CREATE INDEX `jobs_status_idx` ON `jobs` (`publish_status`);--> statement-breakpoint
CREATE TABLE `knowledge_base` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`content` text,
	`asset_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `knowledge_base_project_id_idx` ON `knowledge_base` (`project_id`);--> statement-breakpoint
CREATE TABLE `pipeline_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`pipeline_id` text NOT NULL,
	`source` text NOT NULL,
	`target` text NOT NULL,
	FOREIGN KEY (`pipeline_id`) REFERENCES `pipelines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pipeline_edges_connection_unique` ON `pipeline_edges` (`pipeline_id`,`source`,`target`);--> statement-breakpoint
CREATE INDEX `pipeline_edges_pipeline_id_idx` ON `pipeline_edges` (`pipeline_id`);--> statement-breakpoint
CREATE TABLE `pipeline_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`pipeline_id` text NOT NULL,
	`automation_id` text NOT NULL,
	`type` text NOT NULL,
	`position_x` real NOT NULL,
	`position_y` real NOT NULL,
	`config` text,
	FOREIGN KEY (`pipeline_id`) REFERENCES `pipelines`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`automation_id`) REFERENCES `automation_registry`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `pipeline_nodes_pipeline_id_idx` ON `pipeline_nodes` (`pipeline_id`);--> statement-breakpoint
CREATE TABLE `pipelines` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pipelines_project_id_idx` ON `pipelines` (`project_id`);--> statement-breakpoint
CREATE TABLE `processed_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`job_id` text NOT NULL,
	`node_id` text,
	`payload_hash` text NOT NULL,
	`received_at` integer NOT NULL,
	`processed_at` integer,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `processed_events_event_id_unique` ON `processed_events` (`event_id`);--> statement-breakpoint
CREATE TABLE `project_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'unconfigured' NOT NULL,
	`config` text,
	`encrypted_credentials` text,
	`secret_reference` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_integrations_project_type_unique` ON `project_integrations` (`project_id`,`type`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`website` text NOT NULL,
	`location` text,
	`industry` text,
	`language` text NOT NULL,
	`tone` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `projects_workspace_id_idx` ON `projects` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `prompt_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text NOT NULL,
	`prompt_version_id` text NOT NULL,
	`job_id` text,
	`variables` text NOT NULL,
	`resolved_prompt` text NOT NULL,
	`model_provider` text NOT NULL,
	`model` text NOT NULL,
	`runtime_input` text,
	`runtime_output` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`duration_ms` integer,
	`error_code` text,
	`error_message` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`prompt_version_id`) REFERENCES `prompt_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `prompt_runs_prompt_id_idx` ON `prompt_runs` (`prompt_id`);--> statement-breakpoint
CREATE TABLE `prompt_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text NOT NULL,
	`version` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prompt_versions_prompt_version_unique` ON `prompt_versions` (`prompt_id`,`version`);--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`variables` text NOT NULL,
	`current_version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `prompts_project_id_idx` ON `prompts` (`project_id`);--> statement-breakpoint
CREATE TABLE `resource_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_type` text NOT NULL,
	`resource_key` text NOT NULL,
	`job_id` text NOT NULL,
	`acquired_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`heartbeat_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resource_locks_resource_unique` ON `resource_locks` (`resource_type`,`resource_key`);--> statement-breakpoint
CREATE INDEX `resource_locks_job_id_idx` ON `resource_locks` (`job_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`workspace_id`, `user_id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_members_user_id_idx` ON `workspace_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_slug_unique` ON `workspaces` (`slug`);
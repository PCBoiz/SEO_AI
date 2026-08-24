CREATE TABLE `ai_test_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`prompt_hash` text NOT NULL,
	`status` text NOT NULL,
	`encrypted_result` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`duration_ms` integer,
	`error_code` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_test_runs_workspace_idempotency_unique` ON `ai_test_runs` (`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `ai_test_runs_workspace_created_at_idx` ON `ai_test_runs` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `auth_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_subject` text NOT NULL,
	`provider_email` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_login_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_accounts_provider_subject_unique` ON `auth_accounts` (`provider`,`provider_subject`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_accounts_user_provider_unique` ON `auth_accounts` (`user_id`,`provider`);--> statement-breakpoint
CREATE INDEX `auth_accounts_user_id_idx` ON `auth_accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `oauth_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`provider_email` text,
	`display_label` text,
	`scopes` text NOT NULL,
	`encrypted_tokens` text NOT NULL,
	`access_token_expires_at` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`last_verified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_connections_workspace_user_provider_unique` ON `oauth_connections` (`workspace_id`,`user_id`,`provider`);--> statement-breakpoint
CREATE INDEX `oauth_connections_workspace_id_idx` ON `oauth_connections` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `oauth_connections_user_id_idx` ON `oauth_connections` (`user_id`);
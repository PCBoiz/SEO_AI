CREATE TABLE `tin_nhan_tro_chuyen` (
	`id` text PRIMARY KEY NOT NULL,
	`tro_chuyen_id` text NOT NULL,
	`vai` text NOT NULL,
	`noi_dung` text NOT NULL,
	`provider` text,
	`model` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`duration_ms` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tro_chuyen_id`) REFERENCES `tro_chuyen`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tin_nhan_tro_chuyen_cuoc_idx` ON `tin_nhan_tro_chuyen` (`tro_chuyen_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `tro_chuyen` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text,
	`tieu_de` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tro_chuyen_chu_moi_nhat_idx` ON `tro_chuyen` (`workspace_id`,`user_id`,`updated_at`);
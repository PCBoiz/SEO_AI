CREATE TABLE `user_ai_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`encrypted_key` text NOT NULL,
	`key_hint` text,
	`status` text DEFAULT 'unverified' NOT NULL,
	`last_verified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_ai_keys_user_provider_unique` ON `user_ai_keys` (`user_id`,`provider`);--> statement-breakpoint
CREATE INDEX `user_ai_keys_user_id_idx` ON `user_ai_keys` (`user_id`);
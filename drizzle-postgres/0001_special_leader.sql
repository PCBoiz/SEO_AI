CREATE TABLE "user_ai_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"key_hint" text,
	"status" text DEFAULT 'unverified' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_ai_keys" ADD CONSTRAINT "user_ai_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_ai_keys_user_provider_unique" ON "user_ai_keys" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "user_ai_keys_user_id_idx" ON "user_ai_keys" USING btree ("user_id");
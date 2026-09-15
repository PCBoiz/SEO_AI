CREATE TABLE "tin_nhan_tro_chuyen" (
	"id" text PRIMARY KEY NOT NULL,
	"tro_chuyen_id" text NOT NULL,
	"vai" text NOT NULL,
	"noi_dung" text NOT NULL,
	"provider" text,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"duration_ms" integer,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tro_chuyen" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"tieu_de" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tin_nhan_tro_chuyen" ADD CONSTRAINT "tin_nhan_tro_chuyen_tro_chuyen_id_tro_chuyen_id_fk" FOREIGN KEY ("tro_chuyen_id") REFERENCES "public"."tro_chuyen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tro_chuyen" ADD CONSTRAINT "tro_chuyen_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tro_chuyen" ADD CONSTRAINT "tro_chuyen_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tro_chuyen" ADD CONSTRAINT "tro_chuyen_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tin_nhan_tro_chuyen_cuoc_idx" ON "tin_nhan_tro_chuyen" USING btree ("tro_chuyen_id","created_at");--> statement-breakpoint
CREATE INDEX "tro_chuyen_chu_moi_nhat_idx" ON "tro_chuyen" USING btree ("workspace_id","user_id","updated_at");
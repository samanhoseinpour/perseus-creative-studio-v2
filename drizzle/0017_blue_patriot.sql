CREATE TABLE "task_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"owner_name" text NOT NULL,
	"name" text NOT NULL,
	"query" text NOT NULL,
	"shared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_views" ADD CONSTRAINT "task_views_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_views_user_idx" ON "task_views" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_views_user_name_uidx" ON "task_views" USING btree ("user_id","name");
CREATE TYPE "public"."task_repeat" AS ENUM('none', 'weekly', 'monthly');--> statement-breakpoint
CREATE TABLE "task_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"client_id" uuid,
	"category_id" uuid NOT NULL,
	"assignee_id" text,
	"priority" "task_priority",
	"estimated_minutes" integer NOT NULL,
	"repeat" "task_repeat" DEFAULT 'none' NOT NULL,
	"repeat_day" integer,
	"due_offset_days" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_by_id" text,
	"created_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "template_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "template_run_key" text;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_category_id_task_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."task_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_templates_active_repeat_idx" ON "task_templates" USING btree ("active","repeat");--> statement-breakpoint
CREATE INDEX "task_templates_category_idx" ON "task_templates" USING btree ("category_id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_template_id_task_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."task_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_template_run_idx" ON "tasks" USING btree ("template_id","template_run_key") WHERE "tasks"."template_id" is not null;
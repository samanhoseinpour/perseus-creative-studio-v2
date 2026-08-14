CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE "task_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"site_category" "project_category" NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"client_id" uuid,
	"category_id" uuid NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"assignee_id" text,
	"assignee_name" text NOT NULL,
	"created_by_id" text,
	"created_by_name" text NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"actual_minutes" integer,
	"due_date" date,
	"deliverable_url" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "retainer_minutes" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_category_id_task_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."task_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_status_created_idx" ON "tasks" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "tasks_completed_idx" ON "tasks" USING btree ("completed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "tasks_client_completed_idx" ON "tasks" USING btree ("client_id","completed_at");--> statement-breakpoint
CREATE INDEX "tasks_assignee_created_idx" ON "tasks" USING btree ("assignee_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "tasks_category_idx" ON "tasks" USING btree ("category_id");--> statement-breakpoint
INSERT INTO "task_categories" ("slug", "name", "site_category", "sort_index") VALUES
	('videography', 'Videography', 'production', 10),
	('video-editing', 'Video editing', 'production', 20),
	('photography', 'Photography', 'production', 30),
	('social-media', 'Social media', 'social', 40),
	('web-development', 'Web development', 'websites', 50),
	('seo', 'SEO', 'digital-marketing', 60),
	('content-writing', 'Content writing', 'digital-marketing', 70),
	('design-branding', 'Design & branding', 'branding', 80)
ON CONFLICT ("slug") DO NOTHING;
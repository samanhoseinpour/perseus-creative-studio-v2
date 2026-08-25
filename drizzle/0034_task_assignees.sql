-- DEPLOY ORDER: apply this BEFORE the multi-assignee code deploys.
-- It is purely additive — the old tasks.assignee_id / assignee_name columns are
-- untouched, so the currently-serving deployment keeps working while it runs.
-- The companion migration that DROPS those columns must not run until the new
-- deployment is live, or the old code 500s on every task read.

CREATE TABLE "task_assignees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" text,
	"member_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_template_assignees" (
	"template_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "task_template_assignees_template_id_user_id_pk" PRIMARY KEY("template_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template_assignees" ADD CONSTRAINT "task_template_assignees_template_id_task_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."task_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template_assignees" ADD CONSTRAINT "task_template_assignees_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_assignees_task_user_idx" ON "task_assignees" USING btree ("task_id","user_id") WHERE "task_assignees"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "task_assignees_user_idx" ON "task_assignees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "task_template_assignees_user_idx" ON "task_template_assignees" USING btree ("user_id");
--> statement-breakpoint
-- Backfill: every existing task becomes a one-assignee task, carrying its own
-- created_at so the fan-in's ordering matches the order people were added in.
-- Both source columns are on-table, so this is one sequential scan.
INSERT INTO "task_assignees" ("task_id", "user_id", "member_name", "created_at")
SELECT "id", "assignee_id", "assignee_name", "created_at" FROM "tasks";--> statement-breakpoint
-- Templates carry no name snapshot, so a template whose owner was already
-- offboarded (assignee_id SET NULL) backfills to no rows and mints unassigned,
-- exactly as it does today.
INSERT INTO "task_template_assignees" ("template_id", "user_id")
SELECT "id", "assignee_id" FROM "task_templates" WHERE "assignee_id" IS NOT NULL;

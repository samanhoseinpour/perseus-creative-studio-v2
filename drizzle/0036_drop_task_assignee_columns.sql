-- DEPLOY ORDER: apply this AFTER the multi-assignee code is live, NOT with
-- 0034/0035. It removes columns the previous deployment still reads, so
-- running it while that deployment is serving 500s every task read.
--
-- 0034 (create + backfill) and 0035 (drop the NOT NULL) are both safe to apply
-- before the deploy and must be. This one is the only step that has to wait.
--
-- The data is already duplicated into task_assignees by 0034's backfill, which
-- was verified to cover every row before this was written.

ALTER TABLE "task_templates" DROP CONSTRAINT "task_templates_assignee_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_assignee_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "tasks_assignee_created_idx";--> statement-breakpoint
ALTER TABLE "task_templates" DROP COLUMN "assignee_id";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "assignee_id";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "assignee_name";
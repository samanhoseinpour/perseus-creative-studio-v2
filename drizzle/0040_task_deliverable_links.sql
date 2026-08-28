ALTER TABLE "tasks" ADD COLUMN "deliverable_links" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
-- Backfill: every task that carried the single `deliverable_url` keeps it as
-- its first (and only) link, unnamed — linkLabelFor falls back to the host.
-- Hand-written, the 0037_calver_watermark precedent: drizzle-kit generates the
-- ALTER, the data move is ours.
--
-- `deliverable_url` itself is NOT dropped here. The build running in
-- production still selects it, so dropping it in the same migration breaks
-- every task read between `db:migrate` and the deploy landing — the
-- 0034→0036 task_assignees ordering. A follow-up migration drops it once this
-- code is live.
UPDATE "tasks"
   SET "deliverable_links" = jsonb_build_array(jsonb_build_object('url', "deliverable_url"))
 WHERE "deliverable_url" IS NOT NULL
   AND btrim("deliverable_url") <> '';

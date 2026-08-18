ALTER TABLE "tasks" ADD COLUMN "status_changed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- Backfill: the DEFAULT now() would claim every existing row changed status
-- at deploy time, so the board would open reading "0d" for tasks that have
-- actually been sitting for days. A done row last changed status when it was
-- completed; anything else has no record older than its own creation.
UPDATE "tasks" SET "status_changed_at" = COALESCE("completed_at", "created_at");

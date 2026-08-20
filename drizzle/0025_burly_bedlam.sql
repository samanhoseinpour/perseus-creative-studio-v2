ALTER TABLE "user" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint

-- Backfill, hand-added: without it every existing account would read "Never
-- signed in" on /admin/users until its owner next opened the dashboard.
--
-- Two sources, best-effort. `session.updated_at` is the bulk of it (that is
-- what the page used to display, so this loses nothing that was already on
-- screen). activity_log then recovers the case that column CANNOT answer:
-- signing out deletes the session row, so anyone currently signed out
-- everywhere has no session history left at all, and their sign-in rows are
-- the only surviving evidence they were ever here.
--
-- GREATEST ignores NULL arguments in Postgres, so the second pass safely
-- raises a row the first pass left null.
UPDATE "user" u
SET "last_seen_at" = s.max_at
FROM (
  SELECT "user_id", max("updated_at") AS max_at
  FROM "session"
  GROUP BY "user_id"
) s
WHERE s."user_id" = u."id";--> statement-breakpoint

UPDATE "user" u
SET "last_seen_at" = GREATEST(u."last_seen_at", a.max_at)
FROM (
  SELECT "actor_id", max("created_at") AS max_at
  FROM "activity_log"
  WHERE "actor_id" IS NOT NULL
  GROUP BY "actor_id"
) a
WHERE a."actor_id" = u."id";

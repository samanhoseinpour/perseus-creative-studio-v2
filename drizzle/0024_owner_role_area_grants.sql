-- The three-role access model: promote the owner, move superadmins onto
-- stored area grants, and expand the area vocabulary (portfolio → projects +
-- clients, tasks → tasks + leaderboard, plus the new sensitive 'payroll' and
-- 'logs' grants). Pure data migration — no DDL; `role` is text and `areas` is
-- jsonb already.
--
-- DEPLOY ORDER: apply this FIRST, then deploy the code immediately. Old code
-- reads 'owner' as non-superadmin, so between migrate and deploy the owner
-- account alone is limited to Overview/Profile — AND, worse, old
-- /admin/users treats that row as an ordinary member (its role isn't
-- 'superadmin'), so a superadmin could reset or delete the owner's account
-- from the old UI during the window. Everyone else is unaffected (old code
-- ignores stored areas for role 'superadmin', and statement 3 KEEPS the
-- legacy member keys old code still checks). So: NOBODY touches /admin/users
-- between migrate and deploy, and keep the window to minutes. The reverse
-- order is worse: nobody would hold 'payroll'/'logs' and no owner would
-- exist to grant them.

-- 1. Promote the owner.
UPDATE "user" SET "role" = 'owner'
WHERE lower("email") = 'samangithoseinpour@gmail.com';--> statement-breakpoint

-- 2. Backfill the remaining superadmins with EVERY area, the sensitive pair
--    included — the owner unticks from /admin/users later. Runs after #1 so
--    'superadmin' no longer matches the owner (whose grants stay implicit,
--    with an empty stored array).
UPDATE "user" SET "areas" =
  '["inquiries","applications","tickets","feedback","projects","clients","tasks","leaderboard","reports","payroll","logs"]'::jsonb
WHERE "role" = 'superadmin';--> statement-breakpoint

-- 3. Members: append the split-out keys next to the legacy ones ('portfolio'
--    stays for the deploy window; the new sanitizeAreas drops it on read and
--    the first /admin/users save rewrites the row clean). The NOT-contains
--    guards keep re-runs from duplicating; sanitizeAreas dedupes regardless.
UPDATE "user" SET "areas" = "areas" || '["projects","clients"]'::jsonb
WHERE "role" = 'member' AND "areas" @> '["portfolio"]'::jsonb
  AND NOT "areas" @> '["projects"]'::jsonb;--> statement-breakpoint

UPDATE "user" SET "areas" = "areas" || '["leaderboard"]'::jsonb
WHERE "role" = 'member' AND "areas" @> '["tasks"]'::jsonb
  AND NOT "areas" @> '["leaderboard"]'::jsonb;

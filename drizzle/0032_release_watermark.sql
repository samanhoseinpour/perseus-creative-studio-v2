-- The "what's new" watermark: the newest release each member has been shown.
-- Nullable with no default on purpose — NULL means "clean slate as of first
-- sight", and a DDL default here could only ever be a frozen literal that
-- can't track CURRENT_VERSION, so every account created months from now would
-- inherit today's version. See the column comment in src/db/auth-schema.ts.
--
-- DEPLOY ORDER: apply this FIRST, before the code ships. The column is added
-- to getAccessProfile()'s SELECT list, which every protected admin render goes
-- through — so if the code lands before this migration, EVERY /admin page 500s
-- for everyone, not just a corner of the dashboard. Same failure as migration
-- 0020, and it bites harder here because this feature's whole trigger is a git
-- push (Vercel auto-deploys on push). The reverse order is harmless: the
-- column simply sits unread until the code arrives.

ALTER TABLE "user" ADD COLUMN "release_seen_version" text;--> statement-breakpoint
-- Floor every EXISTING account just below the first shipped release, so the
-- team already here sees exactly one dialog — the 1.5.0 notice that explains
-- the feature — rather than a wall of history on their next load. '1.4.0' is a
-- floor, not a registry version: comparison is numeric and membership is never
-- tested, so it need not exist in RELEASE_VERSIONS.
--
-- This runs ONCE. Accounts created after it keep NULL, which the protected
-- layout materializes to whatever CURRENT_VERSION is on their first sight.
UPDATE "user" SET "release_seen_version" = '1.4.0' WHERE "release_seen_version" IS NULL;

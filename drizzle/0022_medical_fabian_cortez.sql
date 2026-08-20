ALTER TABLE "report_shares" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "timezone_auto" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Seed the current roster so nobody sees the one-time correction TimezoneSync
-- would otherwise apply on their first load. Not load-bearing: a NULL timezone
-- resolves to STUDIO_TZ, and the browser sync fixes anyone missed (a new
-- account, or someone who moves).
UPDATE "user" SET "timezone" = 'Asia/Tehran' WHERE "timezone" IS NULL;--> statement-breakpoint
UPDATE "user" SET "timezone" = 'America/Vancouver' WHERE lower("email") IN (
  'arshiafarrahi99@gmail.com',
  'aryangh1a@gmail.com',
  'info@perseustudio.com'
);

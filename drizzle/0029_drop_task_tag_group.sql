-- Hand-written safety net, and the reason this is a SECOND migration rather
-- than part of 0028: between 0028 and this one, the still-deployed bundle can
-- insert a tag the old way (tag_group set, type_id null). Re-running the
-- backfill here means SET NOT NULL below cannot fail on such a row. A no-op on
-- a database built straight through the migration history.
UPDATE "task_tags" SET "type_id" = (
	SELECT "id" FROM "task_tag_types" WHERE "slug" = "task_tags"."tag_group"::text
) WHERE "type_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "task_tags" ALTER COLUMN "type_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "task_tags" DROP COLUMN "tag_group";--> statement-breakpoint
DROP TYPE "public"."task_tag_group";

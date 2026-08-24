CREATE TABLE "task_tag_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"hint" text,
	"tone" text DEFAULT 'slate' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_tag_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
-- Hand-written: the three types the dropped `task_tag_group` enum encoded,
-- carrying the labels, hints and tones that lived in taskTagFields.ts. Seeded
-- here rather than in db:seed-task-tags because 0029 makes task_tags.type_id
-- NOT NULL, and the backfill below is the only thing that can satisfy it.
INSERT INTO "task_tag_types" ("slug", "name", "hint", "tone", "sort_index") VALUES
	('format', 'Format', 'The shape of the output', 'sky', 0),
	('content', 'Content', 'What the thing is', 'emerald', 10),
	('workflow', 'Workflow', 'The state of the work', 'violet', 20)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "task_tags" ADD COLUMN "type_id" uuid;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_type_id_task_tag_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."task_tag_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Hand-written: every existing tag moves to the row matching its old enum
-- value. Runs before 0029's SET NOT NULL, which is what proves it landed.
UPDATE "task_tags" SET "type_id" = (
	SELECT "id" FROM "task_tag_types" WHERE "slug" = "task_tags"."tag_group"::text
) WHERE "type_id" IS NULL;

CREATE TYPE "public"."job_employment_type" AS ENUM('full_time', 'part_time', 'subcontract');--> statement-breakpoint
CREATE TYPE "public"."job_pay_unit" AS ENUM('HOUR', 'DAY', 'YEAR');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('draft', 'open', 'filled');--> statement-breakpoint
CREATE TABLE "job_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "job_openings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"category_id" uuid NOT NULL,
	"location" text DEFAULT 'Remote' NOT NULL,
	"employment_type" "job_employment_type" NOT NULL,
	"level" text NOT NULL,
	"cadence" text NOT NULL,
	"fit" text NOT NULL,
	"summary" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "job_status" DEFAULT 'draft' NOT NULL,
	"date_posted" date,
	"valid_through" date,
	"pay_min" integer,
	"pay_max" integer,
	"pay_unit" "job_pay_unit",
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_openings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN "role_title" text;--> statement-breakpoint
ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_category_id_job_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."job_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_openings_status_category_sort_idx" ON "job_openings" USING btree ("status","category_id","sort_index");--> statement-breakpoint

-- Careers is a new grantable area (src/lib/adminAreas.ts). Hand it to every
-- account that already edits website content (holds 'projects') — superadmins
-- included, since 0024 moved them onto stored grants too; the owner's grants
-- are implicit. The NOT-contains guard keeps re-runs from duplicating, and
-- sanitizeAreas dedupes on read regardless.
--
-- DEPLOY ORDER: migrate, seed (npm run db:seed-careers), then deploy. Old
-- code ignores the two new tables and role_title, so both steps are inert
-- until the deploy — but old sanitizeAreas drops the unknown 'careers' key on
-- any /admin/users save, so nobody saves there between migrate and deploy.
UPDATE "user" SET "areas" = "areas" || '["careers"]'::jsonb
WHERE "areas" @> '["projects"]'::jsonb
  AND NOT "areas" @> '["careers"]'::jsonb;

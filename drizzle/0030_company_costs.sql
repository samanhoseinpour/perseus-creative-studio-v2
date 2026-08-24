CREATE TYPE "public"."cost_cadence" AS ENUM('monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."cost_category" AS ENUM('subscription', 'software', 'ads', 'hardware', 'service', 'other');--> statement-breakpoint
CREATE TYPE "public"."cost_plan_status" AS ENUM('active', 'paused', 'cancelled');--> statement-breakpoint
CREATE TABLE "cost_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid,
	"month" text NOT NULL,
	"charged_on" date,
	"amount_cad_cents" integer NOT NULL,
	"name" text NOT NULL,
	"vendor" text NOT NULL,
	"category" "cost_category" NOT NULL,
	"billed_note" text,
	"invoice_ref" text,
	"note" text,
	"created_by_id" text,
	"created_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"vendor" text NOT NULL,
	"category" "cost_category" DEFAULT 'subscription' NOT NULL,
	"cadence" "cost_cadence" DEFAULT 'monthly' NOT NULL,
	"status" "cost_plan_status" DEFAULT 'active' NOT NULL,
	"expected_cad_cents" integer,
	"billing_day" integer,
	"started_on" date,
	"ended_on" date,
	"note" text,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_plan_id_cost_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."cost_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cost_entries_month_idx" ON "cost_entries" USING btree ("month");--> statement-breakpoint
CREATE INDEX "cost_entries_plan_month_idx" ON "cost_entries" USING btree ("plan_id","month" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "cost_plans_status_sort_idx" ON "cost_plans" USING btree ("status","sort_index");
-- Hand-written: nothing to backfill, and that is the point.
--
-- `costs` is a SENSITIVE area (src/lib/adminAreas.ts), so unlike 0026 there is
-- deliberately no `UPDATE "user" SET "areas" = ...` here: only the owner holds
-- it, and the owner's grants are COMPUTED (owner ? [...ADMIN_AREAS]) rather
-- than stored, so there is no row to seed. Handing it to anyone else is a
-- deliberate act on /admin/users, refused server-side for any non-owner caller.
--
-- DEPLOY ORDER: apply 0028/0029 (task tags) first, then this, then
-- `npm run db:seed-costs`, then deploy. Old code ignores both tables, so the
-- migration and the seed are inert until the deploy lands — but old
-- sanitizeAreas() drops the unknown 'costs' key on any /admin/users save, so
-- nobody saves there between migrate and deploy.

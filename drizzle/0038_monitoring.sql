CREATE TYPE "public"."monitoring_check_status" AS ENUM('ok', 'failed', 'unknown', 'unconfigured');--> statement-breakpoint
CREATE TYPE "public"."monitoring_incident_kind" AS ENUM('error_burst', 'dependency', 'cron');--> statement-breakpoint
CREATE TYPE "public"."monitoring_incident_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."monitoring_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."monitoring_source" AS ENUM('request', 'action', 'dependency', 'cron');--> statement-breakpoint
CREATE TABLE "monitoring_checks" (
	"component" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"status" "monitoring_check_status" NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"duration_ms" integer,
	"last_ok_at" timestamp with time zone,
	"last_failed_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"error_name" text,
	"detail" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitoring_error_buckets" (
	"bucket_start" timestamp with time zone NOT NULL,
	"environment" text NOT NULL,
	"fingerprint" text NOT NULL,
	"source" "monitoring_source" NOT NULL,
	"scope" text NOT NULL,
	"route_type" text,
	"error_name" text NOT NULL,
	"code" text,
	"component" text,
	"count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_deployment" text,
	"last_deployment" text,
	"last_digest" text,
	"last_request_id" text,
	CONSTRAINT "monitoring_error_buckets_pk" PRIMARY KEY("bucket_start","environment","fingerprint")
);
--> statement-breakpoint
CREATE TABLE "monitoring_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "monitoring_incident_kind" NOT NULL,
	"key" text NOT NULL,
	"component" text,
	"severity" "monitoring_severity" NOT NULL,
	"status" "monitoring_incident_status" DEFAULT 'open' NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"alerted_at" timestamp with time zone,
	"alerted_severity" "monitoring_severity",
	"recovery_notified_at" timestamp with time zone,
	"deployment" text,
	"last_request_id" text,
	"last_digest" text
);
--> statement-breakpoint
CREATE INDEX "monitoring_error_buckets_fingerprint_bucket_idx" ON "monitoring_error_buckets" USING btree ("fingerprint","bucket_start" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "monitoring_error_buckets_component_bucket_idx" ON "monitoring_error_buckets" USING btree ("component","bucket_start" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "monitoring_incidents_open_uidx" ON "monitoring_incidents" USING btree ("kind","key") WHERE "monitoring_incidents"."status" = 'open';--> statement-breakpoint
CREATE INDEX "monitoring_incidents_status_seen_idx" ON "monitoring_incidents" USING btree ("status","last_seen_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "monitoring_incidents_resolved_idx" ON "monitoring_incidents" USING btree ("resolved_at");
-- Hand-appended, the house convention. Three additive tables and five enums for
-- /admin/monitoring — see the block comment above the tables in src/db/schema.ts.
--
-- NOTHING here holds a diagnostic: no message, no stack, no bound parameter, no
-- request body. `monitoring_error_buckets` is counters keyed by a fingerprint of
-- (source, scope, route type, error class, code); `monitoring_checks` is one
-- upserted row per probed dependency or cron job; `monitoring_incidents` is the
-- open/resolved lifecycle with the alert bookkeeping on the row. Every string
-- column is filled through src/lib/monitoringFields.ts, whose grammars are
-- closed and pinned by scripts/check-monitoring.mts.
--
-- `monitoring_incidents_open_uidx` (UNIQUE (kind, key) WHERE status = 'open') is
-- the dedup mechanism for Vercel's documented duplicate cron invocations: every
-- ON CONFLICT against it must repeat the predicate verbatim (targetWhere), or
-- Postgres raises 42P10 — the recurring-tasks lesson.
--
-- No `UPDATE "user" SET "areas"` for the new 'monitoring' area: it is SENSITIVE
-- (owner-granted only) and the owner's grants are computed, not stored — the
-- 0030 costs precedent.
--
-- DEPLOY ORDER: migrate FIRST, then deploy. Old code ignores these tables, so
-- the migration is inert until the deploy lands; new code writes to them from
-- its first request, so deploying first would 500 every error report and every
-- cron until the tables existed. Retention: buckets 30 days, resolved incidents
-- 90 days, both swept by /api/cron/monitoring in batches.

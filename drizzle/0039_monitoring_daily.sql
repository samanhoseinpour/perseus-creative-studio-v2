CREATE TABLE "monitoring_daily" (
	"component" text NOT NULL,
	"day" text NOT NULL,
	"ok" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"unknown" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monitoring_daily_pk" PRIMARY KEY("component","day")
);

-- Hand-appended. One row per (component, UTC day) of probe/run outcomes — the
-- denominator behind the two in-app SLOs on /admin/monitoring (dependency
-- availability, cron reliability). Bumped by the evaluator and by runCron;
-- summed over 30 days; swept with the resolved incidents at 90 days. Additive
-- and inert until the deploy lands. DEPLOY ORDER: migrate first, then deploy.

CREATE TYPE "public"."payroll_currency" AS ENUM('CAD', 'IRT');--> statement-breakpoint
CREATE TYPE "public"."payroll_event_kind" AS ENUM('created', 'updated', 'status', 'note', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."payroll_member_status" AS ENUM('active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."payroll_payment_status" AS ENUM('draft', 'sent', 'received', 'flagged', 'void');--> statement-breakpoint
CREATE TABLE "payroll_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid,
	"member_id" uuid,
	"member_name" text NOT NULL,
	"month" text NOT NULL,
	"actor_id" text,
	"actor_name" text NOT NULL,
	"kind" "payroll_event_kind" NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"display_name" text NOT NULL,
	"status" "payroll_member_status" DEFAULT 'active' NOT NULL,
	"joined_on" date,
	"ended_on" date,
	"self_view_enabled" boolean DEFAULT true NOT NULL,
	"pay_currency" "payroll_currency" DEFAULT 'IRT' NOT NULL,
	"notes" text,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_members_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "payroll_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"month" text NOT NULL,
	"anchor_currency" "payroll_currency" NOT NULL,
	"anchor_amount" bigint NOT NULL,
	"paid_currency" "payroll_currency" NOT NULL,
	"paid_amount" bigint DEFAULT 0 NOT NULL,
	"rate_micro" bigint,
	"cost_cad_cents" integer DEFAULT 0 NOT NULL,
	"fee_cad_cents" integer DEFAULT 0 NOT NULL,
	"prorated_days" integer,
	"month_days" integer,
	"proration_note" text,
	"status" "payroll_payment_status" DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"nudged_at" timestamp with time zone,
	"wire_ref" text,
	"member_note" text,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_payments_run_member_unique" UNIQUE("run_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" text NOT NULL,
	"rate_micro" bigint,
	"invoice_ref" text,
	"note" text,
	"sent_at" timestamp with time zone,
	"sent_by_id" text,
	"sent_by_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_runs_month_unique" UNIQUE("month")
);
--> statement-breakpoint
CREATE TABLE "payroll_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"anchor_currency" "payroll_currency" NOT NULL,
	"anchor_amount" bigint NOT NULL,
	"note" text,
	"created_by_id" text,
	"created_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_terms_member_from_unique" UNIQUE("member_id","effective_from")
);
--> statement-breakpoint
ALTER TABLE "payroll_events" ADD CONSTRAINT "payroll_events_payment_id_payroll_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payroll_payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_events" ADD CONSTRAINT "payroll_events_member_id_payroll_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."payroll_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_events" ADD CONSTRAINT "payroll_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_members" ADD CONSTRAINT "payroll_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_run_id_payroll_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_member_id_payroll_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."payroll_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_sent_by_id_user_id_fk" FOREIGN KEY ("sent_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_terms" ADD CONSTRAINT "payroll_terms_member_id_payroll_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."payroll_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_terms" ADD CONSTRAINT "payroll_terms_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payroll_events_payment_created_idx" ON "payroll_events" USING btree ("payment_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "payroll_events_member_created_idx" ON "payroll_events" USING btree ("member_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "payroll_members_status_sort_idx" ON "payroll_members" USING btree ("status","sort_index");--> statement-breakpoint
CREATE INDEX "payroll_payments_member_month_idx" ON "payroll_payments" USING btree ("member_id","month" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "payroll_payments_month_idx" ON "payroll_payments" USING btree ("month");--> statement-breakpoint
CREATE INDEX "payroll_terms_member_from_idx" ON "payroll_terms" USING btree ("member_id","effective_from" DESC NULLS LAST);
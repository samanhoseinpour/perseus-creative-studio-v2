CREATE TYPE "public"."contact_kind" AS ENUM('project', 'career');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('new', 'read', 'archived', 'spam');--> statement-breakpoint
CREATE TABLE "contact_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"kind" "contact_kind" NOT NULL,
	"status" "contact_status" DEFAULT 'new' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"country" text,
	"company" text,
	"instagram" text,
	"website" text,
	"services" jsonb,
	"message" text,
	"role" text,
	"portfolio_url" text,
	"linkedin_url" text,
	"resume_path" text,
	"email_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_submissions_client_id_unique" UNIQUE("client_id")
);

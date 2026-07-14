CREATE TYPE "public"."feedback_vote" AS ENUM('up', 'down');--> statement-breakpoint
CREATE TABLE "article_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"slug" text NOT NULL,
	"vote" "feedback_vote" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_feedback_client_slug" UNIQUE("client_id","slug")
);

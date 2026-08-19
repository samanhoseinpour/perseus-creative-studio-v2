CREATE TYPE "public"."activity_action" AS ENUM('create', 'update', 'delete', 'status', 'grant', 'auth', 'send', 'export', 'access');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"actor_name" text NOT NULL,
	"area" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"entity_name" text NOT NULL,
	"action" "activity_action" NOT NULL,
	"summary" text NOT NULL,
	"payload" jsonb,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_created_idx" ON "activity_log" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activity_log_actor_created_idx" ON "activity_log" USING btree ("actor_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activity_log_area_created_idx" ON "activity_log" USING btree ("area","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activity_log_entity_idx" ON "activity_log" USING btree ("entity","entity_id","created_at" DESC NULLS LAST);
-- Web Push subscriptions: one row per BROWSER INSTALL that asked to be
-- notified. See the block comment on pushSubscriptions in src/db/schema.ts for
-- why this cascades (a live capability, not history) and why the unique is on
-- `endpoint` alone (so a shared browser has exactly one owner at a time).
--
-- DEPLOY ORDER: harmless either way. Nothing in the existing app reads this
-- table, so applying it early is safe; and the push code degrades to rendering
-- nothing when the VAPID keys are unset, so shipping the code first only means
-- the feature stays inert until both the table and the keys exist.

CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_notified_at" timestamp with time zone,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_created_idx" ON "push_subscriptions" USING btree ("user_id","created_at" DESC NULLS LAST);
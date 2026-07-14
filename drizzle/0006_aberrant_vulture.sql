CREATE INDEX "article_feedback_slug_vote_idx" ON "article_feedback" USING btree ("slug","vote");--> statement-breakpoint
CREATE INDEX "contact_submissions_kind_status_created_idx" ON "contact_submissions" USING btree ("kind","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "contact_submissions_kind_created_idx" ON "contact_submissions" USING btree ("kind","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "contact_submissions_kind_role_idx" ON "contact_submissions" USING btree ("kind","role");--> statement-breakpoint
CREATE INDEX "contact_submissions_kind_source_idx" ON "contact_submissions" USING btree ("kind","referral_source");--> statement-breakpoint
CREATE INDEX "contact_submissions_services_idx" ON "contact_submissions" USING gin ("services");--> statement-breakpoint
CREATE INDEX "tickets_status_created_idx" ON "tickets" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "tickets_reporter_created_idx" ON "tickets" USING btree ("reporter_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_user_id_idx" ON "passkey" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_credential_id_idx" ON "passkey" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");
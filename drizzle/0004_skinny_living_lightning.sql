ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "areas" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "user" SET "role" = 'superadmin'
WHERE lower("email") IN ('info@perseustudio.com','aryangh1a@gmail.com','samangithoseinpour@gmail.com');
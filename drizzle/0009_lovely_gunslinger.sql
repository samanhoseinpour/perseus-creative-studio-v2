CREATE TYPE "public"."client_logo_disc" AS ENUM('light', 'dark');--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "marquee_sort" integer;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "marquee_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "logo_disc" "client_logo_disc";--> statement-breakpoint
ALTER TABLE "clients" DROP COLUMN "visibility";
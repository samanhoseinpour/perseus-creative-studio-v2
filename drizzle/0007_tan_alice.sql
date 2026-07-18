CREATE TYPE "public"."content_visibility" AS ENUM('public', 'unlisted', 'draft');--> statement-breakpoint
CREATE TYPE "public"."project_category" AS ENUM('production', 'websites', 'digital-marketing', 'social', 'branding');--> statement-breakpoint
CREATE TYPE "public"."project_media_kind" AS ENUM('cover', 'image', 'youtube', 'instagram');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"industry" text,
	"location" text,
	"website_url" text,
	"instagram" text,
	"bio" text,
	"logo_static_path" text,
	"logo_blob_url" text,
	"logo_blob_path" text,
	"visibility" "content_visibility" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "project_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" "project_media_kind" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"variants" jsonb,
	"blur_data_url" text,
	"alt" text,
	"embed_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "project_category" NOT NULL,
	"slug" text NOT NULL,
	"client_id" uuid,
	"client_name" text,
	"title" text NOT NULL,
	"industry" text NOT NULL,
	"location" text,
	"year" text NOT NULL,
	"summary" text NOT NULL,
	"description" text,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"external_url" text,
	"testimonial_quote" text,
	"testimonial_name" text,
	"testimonial_role" text,
	"cover_static_path" text,
	"cover_static_alt" text,
	"featured" boolean DEFAULT false NOT NULL,
	"visibility" "content_visibility" DEFAULT 'draft' NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_category_slug" UNIQUE("category","slug")
);
--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_media_project_sort_idx" ON "project_media" USING btree ("project_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "project_media_cover_uidx" ON "project_media" USING btree ("project_id") WHERE kind = 'cover';--> statement-breakpoint
CREATE INDEX "projects_visibility_category_sort_idx" ON "projects" USING btree ("visibility","category","sort_index");--> statement-breakpoint
CREATE INDEX "projects_client_idx" ON "projects" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "projects_services_idx" ON "projects" USING gin ("services");
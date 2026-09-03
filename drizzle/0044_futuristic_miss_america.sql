CREATE TYPE "public"."blog_author_kind" AS ENUM('person', 'organization');--> statement-breakpoint
CREATE TYPE "public"."blog_post_status" AS ENUM('draft', 'scheduled', 'published', 'archived', 'trash');--> statement-breakpoint
CREATE TYPE "public"."blog_revision_reason" AS ENUM('import', 'save', 'publish', 'schedule', 'unpublish', 'restore');--> statement-breakpoint
CREATE TABLE "blog_authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "blog_author_kind" DEFAULT 'person' NOT NULL,
	"role" text NOT NULL,
	"bio" text NOT NULL,
	"image_static_path" text,
	"image_media" jsonb,
	"og_image_static_path" text,
	"same_as" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"knows_about" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"location" jsonb,
	"user_id" text,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_authors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"same_as" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_entities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "blog_post_entities" (
	"post_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "blog_post_entities_post_id_entity_id_pk" PRIMARY KEY("post_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE "blog_post_related" (
	"post_id" uuid NOT NULL,
	"related_post_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "blog_post_related_post_id_related_post_id_pk" PRIMARY KEY("post_id","related_post_id")
);
--> statement-breakpoint
CREATE TABLE "blog_post_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"reason" "blog_revision_reason" NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"category_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"content_modified_at" timestamp with time zone,
	"robots_index" boolean DEFAULT true NOT NULL,
	"llms_include" boolean DEFAULT true NOT NULL,
	"word_count" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"actor_id" text,
	"actor_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_post_revisions_post_number" UNIQUE("post_id","number")
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"legacy_id" integer,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"service_slug" text,
	"hero_static_path" text,
	"hero_media" jsonb,
	"hero_alt" text NOT NULL,
	"hero_caption" text,
	"body" jsonb NOT NULL,
	"body_text" text NOT NULL,
	"word_count" integer NOT NULL,
	"key_takeaways" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"faqs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" text NOT NULL,
	"seo_description" text NOT NULL,
	"canonical_override" text,
	"og_title" text NOT NULL,
	"og_description" text NOT NULL,
	"og_image_static_path" text,
	"og_image_media" jsonb,
	"twitter_card" text DEFAULT 'summary_large_image' NOT NULL,
	"robots_index" boolean DEFAULT true NOT NULL,
	"robots_follow" boolean DEFAULT true NOT NULL,
	"robots_extra" jsonb,
	"focus_keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"emit_legacy_meta_keywords" boolean DEFAULT false NOT NULL,
	"custom_schema" jsonb,
	"llms_include" boolean DEFAULT true NOT NULL,
	"status" "blog_post_status" DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"content_modified_at" timestamp with time zone,
	"trashed_at" timestamp with time zone,
	"published_revision_id" uuid,
	"pending_revision_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "blog_posts_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "blog_posts_trash_stamp" CHECK (("blog_posts"."status" = 'trash') = ("blog_posts"."trashed_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "blog_authors" ADD CONSTRAINT "blog_authors_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_entities" ADD CONSTRAINT "blog_post_entities_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_entities" ADD CONSTRAINT "blog_post_entities_entity_id_blog_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."blog_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_related" ADD CONSTRAINT "blog_post_related_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_related" ADD CONSTRAINT "blog_post_related_related_post_id_blog_posts_id_fk" FOREIGN KEY ("related_post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_revisions" ADD CONSTRAINT "blog_post_revisions_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_revisions" ADD CONSTRAINT "blog_post_revisions_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_revisions" ADD CONSTRAINT "blog_post_revisions_author_id_blog_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."blog_authors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_revisions" ADD CONSTRAINT "blog_post_revisions_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_blog_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."blog_authors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_published_revision_id_blog_post_revisions_id_fk" FOREIGN KEY ("published_revision_id") REFERENCES "public"."blog_post_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_pending_revision_id_blog_post_revisions_id_fk" FOREIGN KEY ("pending_revision_id") REFERENCES "public"."blog_post_revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blog_post_related_target_idx" ON "blog_post_related" USING btree ("related_post_id");--> statement-breakpoint
CREATE INDEX "blog_post_revisions_post_created_idx" ON "blog_post_revisions" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "blog_posts_status_published_idx" ON "blog_posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "blog_posts_category_status_idx" ON "blog_posts" USING btree ("category_id","status");--> statement-breakpoint
CREATE INDEX "blog_posts_author_status_idx" ON "blog_posts" USING btree ("author_id","status");
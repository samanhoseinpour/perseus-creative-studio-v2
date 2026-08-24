CREATE TYPE "public"."task_tag_group" AS ENUM('format', 'content', 'workflow');--> statement-breakpoint
CREATE TABLE "task_tag_categories" (
	"tag_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "task_tag_categories_tag_id_category_id_pk" PRIMARY KEY("tag_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "task_tag_links" (
	"task_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "task_tag_links_task_id_tag_id_pk" PRIMARY KEY("task_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "task_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tag_group" "task_tag_group" NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "task_tag_categories" ADD CONSTRAINT "task_tag_categories_tag_id_task_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."task_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tag_categories" ADD CONSTRAINT "task_tag_categories_category_id_task_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."task_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tag_links" ADD CONSTRAINT "task_tag_links_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tag_links" ADD CONSTRAINT "task_tag_links_tag_id_task_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."task_tags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_tag_categories_category_idx" ON "task_tag_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "task_tag_links_tag_idx" ON "task_tag_links" USING btree ("tag_id");
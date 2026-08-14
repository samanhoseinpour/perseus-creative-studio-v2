CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "priority" "task_priority";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "start_date" date;
CREATE TYPE "public"."test_environment" AS ENUM('ci', 'local');--> statement-breakpoint
CREATE TYPE "public"."test_result_status" AS ENUM('passed', 'failed', 'skipped', 'todo', 'timed_out', 'interrupted', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."test_runner" AS ENUM('vitest', 'playwright');--> statement-breakpoint
CREATE TABLE "test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"file" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"status" "test_result_status" NOT NULL,
	"duration_ms" integer NOT NULL,
	"retry" integer,
	"project_name" text,
	"error_count" integer DEFAULT 0,
	"recorded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_runs" (
	"run_id" text PRIMARY KEY NOT NULL,
	"runner" "test_runner" NOT NULL,
	"suite" text NOT NULL,
	"environment" "test_environment" NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"total_duration_ms" integer NOT NULL,
	"total_tests" integer NOT NULL,
	"passed" integer NOT NULL,
	"failed" integer NOT NULL,
	"skipped" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignments" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."assignment_type";--> statement-breakpoint
CREATE TYPE "public"."assignment_type" AS ENUM('nacional', 'exterior');--> statement-breakpoint
ALTER TABLE "assignments" ALTER COLUMN "type" SET DATA TYPE "public"."assignment_type" USING "type"::"public"."assignment_type";--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_run_id_test_runs_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."test_runs"("run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_test_results_run_id" ON "test_results" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_test_results_status" ON "test_results" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_test_results_duration" ON "test_results" USING btree ("duration_ms");--> statement-breakpoint
CREATE INDEX "idx_test_runs_runner_suite" ON "test_runs" USING btree ("runner","suite");--> statement-breakpoint
CREATE INDEX "idx_test_runs_started_at" ON "test_runs" USING btree ("started_at");
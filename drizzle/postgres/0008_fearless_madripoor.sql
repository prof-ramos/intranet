CREATE TYPE "public"."assignment_type" AS ENUM('domestic', 'abroad');--> statement-breakpoint
ALTER TYPE "public"."audit_entity_type" ADD VALUE 'assignment' BEFORE 'legal_consultation';--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"type" "assignment_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "entity_id" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_activities_associate_due_id" ON "activities" USING btree ("associate_id","due_date","id");
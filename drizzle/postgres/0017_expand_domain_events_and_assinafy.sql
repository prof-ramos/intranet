ALTER TYPE "public"."assinafy_document_status" ADD VALUE 'partially_signed' BEFORE 'rejected_by_signer';--> statement-breakpoint
ALTER TABLE "domain_events" ALTER COLUMN "event_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."domain_event_type";--> statement-breakpoint
CREATE TYPE "public"."domain_event_type" AS ENUM('associate.updated', 'legal_consultation.created', 'legal_consultation.status_changed', 'official_letter.created', 'official_letter.published', 'official_letter.status_changed', 'monthly_payment.updated');--> statement-breakpoint
ALTER TABLE "domain_events" ALTER COLUMN "event_type" SET DATA TYPE "public"."domain_event_type" USING "event_type"::"public"."domain_event_type";--> statement-breakpoint
ALTER TABLE "oficios" ADD COLUMN IF NOT EXISTS "assinafy_signing_url" text;
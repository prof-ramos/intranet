CREATE TYPE "public"."payment_origin" AS ENUM('sigepe', 'itamaraty', 'comprovante', 'outros');--> statement-breakpoint
ALTER TABLE "monthly_payments" ADD COLUMN "amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "monthly_payments" ADD COLUMN "origin" "payment_origin" DEFAULT 'outros' NOT NULL;--> statement-breakpoint
ALTER TABLE "monthly_payments" ADD COLUMN "notes" text;--> statement-breakpoint
CREATE INDEX "idx_monthly_payments_year_month_origin" ON "monthly_payments" USING btree ("year","month","origin");--> statement-breakpoint
ALTER TABLE "monthly_payments" ADD CONSTRAINT "chk_monthly_payments_amount_positive" CHECK ("monthly_payments"."amount" IS NULL OR "monthly_payments"."amount" > 0);--> statement-breakpoint
ALTER TABLE "monthly_payments" ADD CONSTRAINT "chk_monthly_payments_notes_length" CHECK ("monthly_payments"."notes" IS NULL OR char_length("monthly_payments"."notes") <= 2000);
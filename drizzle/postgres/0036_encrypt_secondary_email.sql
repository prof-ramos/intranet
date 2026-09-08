-- Leftover plaintext in secondary_email is not backfilled here.
-- New writes null plaintext via buildPiiPatch; a later job encrypts existing values.
ALTER TABLE "associates" ADD COLUMN IF NOT EXISTS "secondary_email_ciphertext" text;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN IF NOT EXISTS "secondary_email_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_associates_secondary_email_hash" ON "associates" USING btree ("secondary_email_hash");--> statement-breakpoint
ALTER TABLE "associates" ADD CONSTRAINT "chk_associates_secondary_email_pii" CHECK ("associates"."secondary_email" IS NULL OR "associates"."secondary_email_ciphertext" IS NULL);

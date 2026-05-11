-- Repair drift from early legal module databases that were missing this column.
ALTER TABLE "legal_consultations"
ADD COLUMN IF NOT EXISTS "last_interaction_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_legal_consultations_last_interaction"
ON "legal_consultations" USING btree ("last_interaction_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_legal_consultations_open_last_interaction"
ON "legal_consultations" USING btree ("last_interaction_at")
WHERE "status" <> 'arquivada';

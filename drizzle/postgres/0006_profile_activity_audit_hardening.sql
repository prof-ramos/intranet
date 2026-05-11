ALTER TABLE "audit_logs" ALTER COLUMN "entity_id" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_activities_associate_due_id"
  ON "activities" ("associate_id", "due_date", "id");

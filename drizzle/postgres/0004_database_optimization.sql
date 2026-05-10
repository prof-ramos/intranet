-- Enable trigram extension for GIN text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Critical FK index: legal_consultations.answered_by -> admins(id)
-- Used by getConsultationById LEFT JOIN on answered_by
CREATE INDEX "idx_legal_consultations_answered_by"
ON "legal_consultations" USING btree ("answered_by");

-- 2. Legal module partial indexes for SLA/staleness queries
-- WHERE status <> 'arquivada' matches most rows; partial indexes are selective
CREATE INDEX "idx_legal_consultations_open_sla"
ON "legal_consultations" USING btree ("sla_due_date")
WHERE "status" <> 'arquivada';

CREATE INDEX "idx_legal_consultations_open_last_interaction"
ON "legal_consultations" USING btree ("last_interaction_at")
WHERE "status" <> 'arquivada';

-- 3. Composite index for getPendingActions: status = 'aguardando_escritorio' ORDER BY updated_at
CREATE INDEX "idx_legal_consultations_status_updated_at"
ON "legal_consultations" USING btree ("status", "updated_at");

-- 4. Partial index for consultations responded this month (alternative to non-IMMUTABLE date_trunc)
CREATE INDEX "idx_legal_consultations_responded"
ON "legal_consultations" USING btree ("updated_at")
WHERE "status" = 'respondida';

-- 5. Associates search & filter indexes
-- GIN trigram for LIKE '%term%' name search (leading wildcard, btree can't help)
CREATE INDEX "idx_associates_name_trgm"
ON "associates" USING gin ("full_name" gin_trgm_ops);

-- Functional index for birth-month filter in reports
CREATE INDEX "idx_associates_birth_month"
ON "associates" USING btree (extract(month from "birth_date"));

-- Composite for getTopRegions: WHERE association_status = 'ativo' GROUP BY location_country
CREATE INDEX "idx_associates_status_country"
ON "associates" USING btree ("association_status", "location_country");

-- 6. Activities indexes
-- Partial index for overdue/urgent queries: status <> 'concluido' AND due_date < now()
CREATE INDEX "idx_activities_open_due_date"
ON "activities" USING btree ("due_date")
WHERE "status" <> 'concluido';

-- Position index for kanban ordering
CREATE INDEX "idx_activities_position"
ON "activities" USING btree ("position");

-- 7. JSONB tag indexes (future-proofing)
CREATE INDEX "idx_legal_opinions_tags"
ON "legal_opinions" USING gin ("tags");

CREATE INDEX "idx_activities_tags"
ON "activities" USING gin ("tags");

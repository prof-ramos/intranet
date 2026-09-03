-- Performance indexes for hot list/search paths (Wave E).
-- Prefer CREATE INDEX CONCURRENTLY on large production tables; see docs/runbook.md
-- "Índices CONCURRENTLY (performance)". These non-concurrent forms are safe for
-- migrate/CI/empty-or-small DBs.

CREATE INDEX IF NOT EXISTS idx_activities_open_updated
  ON activities (updated_at DESC, id DESC)
  WHERE status <> 'concluido';

CREATE INDEX IF NOT EXISTS idx_activities_title_trgm
  ON activities USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_audit_entity_created
  ON audit_logs (entity_type, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action_trgm
  ON audit_logs USING gin (action gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_legal_notes_entity_created
  ON legal_notes (entity_type, entity_id, created_at, id);

CREATE INDEX IF NOT EXISTS idx_legal_consultations_title_trgm
  ON legal_consultations USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_legal_consultations_internal_number_trgm
  ON legal_consultations USING gin (internal_number gin_trgm_ops);

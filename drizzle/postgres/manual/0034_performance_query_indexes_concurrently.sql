-- PRODUCTION-ONLY companion for 0034_performance_query_indexes.sql
-- Run via psql on DATABASE_MIGRATION_URL (direct) when tables are large:
--
--   psql "$DATABASE_MIGRATION_URL" -f drizzle/postgres/manual/0034_performance_query_indexes_concurrently.sql
--
-- Then insert the migration hash into drizzle.__drizzle_migrations if you did
-- NOT apply 0034 via npm run db:migrate (see docs/runbook.md).
-- If 0034 already applied non-concurrently, skip this file.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_open_updated
  ON activities (updated_at DESC, id DESC)
  WHERE status <> 'concluido';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_title_trgm
  ON activities USING gin (title gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_entity_created
  ON audit_logs (entity_type, created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_action_trgm
  ON audit_logs USING gin (action gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_notes_entity_created
  ON legal_notes (entity_type, entity_id, created_at, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_consultations_title_trgm
  ON legal_consultations USING gin (title gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_consultations_internal_number_trgm
  ON legal_consultations USING gin (internal_number gin_trgm_ops);

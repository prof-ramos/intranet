-- Migration 0009: Quality improvements
-- Indexes, extensions, enum conversions, RLS

-- 1. Enable pg_stat_statements for query monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 2. New indexes for query performance
CREATE INDEX IF NOT EXISTS idx_legal_consultations_title_trgm
  ON legal_consultations USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_legal_consultations_status_created_at
  ON legal_consultations (status, created_at DESC);

-- 3. Remove redundant indexes (covered by partial/composite alternatives)
DROP INDEX IF EXISTS idx_activities_due_date;
DROP INDEX IF EXISTS idx_legal_consultations_last_interaction;

-- 4. Convert legal_processes.satisfaction from text to legal_satisfaction enum
ALTER TABLE legal_processes
  ALTER COLUMN satisfaction TYPE legal_satisfaction
  USING satisfaction::legal_satisfaction;

-- 5. Convert legal_notes.entity_type from text to legal_note_entity_type enum
CREATE TYPE legal_note_entity_type AS ENUM ('consultation', 'process');
ALTER TABLE legal_notes
  ALTER COLUMN entity_type TYPE legal_note_entity_type
  USING entity_type::legal_note_entity_type;

-- 6. Re-enable Row-Level Security as defense-in-depth
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE associates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_opinions ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_opinion_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- 7. Permissive RLS policies (auth is enforced server-side by requireAuth/requireRole)
CREATE POLICY "admins_all" ON admins FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "associates_all" ON associates FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "activities_all" ON activities FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "audit_logs_all" ON audit_logs FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "legal_consultations_all" ON legal_consultations FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "legal_processes_all" ON legal_processes FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "legal_notes_all" ON legal_notes FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "legal_opinions_all" ON legal_opinions FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "legal_opinion_tags_all" ON legal_opinion_tags FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "assignments_all" ON assignments FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "login_attempts_all" ON login_attempts FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "rate_limits_all" ON rate_limits FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

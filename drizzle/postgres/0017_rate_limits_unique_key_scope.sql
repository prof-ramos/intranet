-- Make rate_limits(key, scope) unique to enable atomic upsert (ON CONFLICT)
-- Deduplicate any existing rows before creating the unique index
DELETE FROM rate_limits a USING rate_limits b
WHERE a.key = b.key AND a.scope = b.scope AND a.id < b.id;

DROP INDEX IF EXISTS idx_rate_limits_key_scope;
CREATE UNIQUE INDEX idx_rate_limits_key_scope ON rate_limits (key, scope);
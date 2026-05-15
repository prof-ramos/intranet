CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_associates_name_trgm ON associates USING GIN (full_name gin_trgm_ops);

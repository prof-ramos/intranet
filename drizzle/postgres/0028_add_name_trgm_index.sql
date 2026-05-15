CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX CONCURRENTLY idx_associates_name_trgm ON associates USING GIN (full_name extensions.gin_trgm_ops);
-- Create GIN trigram index for textual search on lawyers name
CREATE INDEX IF NOT EXISTS idx_lawyers_name_trgm ON lawyers USING gin (name gin_trgm_ops);

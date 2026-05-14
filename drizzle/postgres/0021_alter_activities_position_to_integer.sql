-- W2.3: Convert activities.position from real to integer
-- Drizzle-kit does NOT generate the USING clause for type casts (Issue #2751)
ALTER TABLE activities ALTER COLUMN position TYPE integer USING ROUND(position);
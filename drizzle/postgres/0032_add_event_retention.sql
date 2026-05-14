-- W3.10: Event retention policy
-- Add expires_at column to domain_events for automatic retention cleanup.
-- Existing events get a 90-day expiry from their occurred_at timestamp.

ALTER TABLE domain_events ADD COLUMN expires_at timestamptz;

-- Backfill: set expiry for existing events
UPDATE domain_events SET expires_at = occurred_at + INTERVAL '90 days' WHERE expires_at IS NULL;

-- Index for efficient cleanup queries
CREATE INDEX idx_domain_events_expires_at ON domain_events (expires_at);
CREATE INDEX idx_domain_events_pending ON domain_events (id) WHERE delivery_status = 'pending';

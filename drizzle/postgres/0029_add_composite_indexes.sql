CREATE INDEX CONCURRENTLY idx_monthly_payments_association_status ON monthly_payments (association_status, contribution_status);
CREATE INDEX CONCURRENTLY idx_monthly_payments_associate_id ON monthly_payments (associate_id);
CREATE INDEX CONCURRENTLY idx_oficios_created_at_desc ON oficios (created_at DESC);
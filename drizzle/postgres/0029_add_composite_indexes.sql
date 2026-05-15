CREATE INDEX IF NOT EXISTS idx_monthly_payments_associate_id ON monthly_payments (associate_id);
CREATE INDEX IF NOT EXISTS idx_oficios_created_at_desc ON oficios (created_at DESC);

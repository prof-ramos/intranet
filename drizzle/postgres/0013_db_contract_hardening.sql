-- 0013_db_contract_hardening.sql
-- Keep the live database aligned with the Drizzle schema and schema contract.

CREATE INDEX IF NOT EXISTS idx_monthly_payments_status
  ON monthly_payments (status);

CREATE INDEX IF NOT EXISTS idx_monthly_payments_updated_by
  ON monthly_payments (updated_by);

CREATE INDEX IF NOT EXISTS idx_monthly_payments_year_month_status
  ON monthly_payments (year, month, status);

CREATE INDEX IF NOT EXISTS idx_monthly_payments_year_month_method
  ON monthly_payments (year, month, payment_method);

CREATE INDEX IF NOT EXISTS idx_oficios_created_by
  ON oficios (created_by);

CREATE INDEX IF NOT EXISTS idx_oficios_updated_by
  ON oficios (updated_by);

ALTER TABLE monthly_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "monthly_payments_all"
    ON monthly_payments
    FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

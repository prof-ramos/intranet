-- W2.2: Add CHECK constraints for range validation
-- pgEnum already enforces enum values; these CHECKs are for range constraints only

ALTER TABLE monthly_payments ADD CONSTRAINT chk_monthly_payments_month CHECK (month BETWEEN 1 AND 12);
ALTER TABLE monthly_payments ADD CONSTRAINT chk_monthly_payments_year CHECK (year BETWEEN 2000 AND 2100);
ALTER TABLE oficios ADD CONSTRAINT chk_oficios_year CHECK (year BETWEEN 2000 AND 2100);
ALTER TABLE oficios ADD CONSTRAINT chk_oficios_sequence CHECK (sequence > 0);
ALTER TABLE webhook_deliveries ADD CONSTRAINT chk_webhook_deliveries_attempt CHECK (attempt > 0);
ALTER TYPE "public"."payment_status" ADD VALUE IF NOT EXISTS 'cancelado';

ALTER TABLE monthly_payments
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by bigint REFERENCES admins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_monthly_payments_cancelled_at
  ON monthly_payments (cancelled_at)
  WHERE cancelled_at IS NOT NULL;

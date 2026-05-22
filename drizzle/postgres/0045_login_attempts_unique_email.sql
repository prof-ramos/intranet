-- F-001: Add unique constraint on login_attempts.email to prevent race-condition
-- duplicate rows and enable atomic INSERT...ON CONFLICT DO UPDATE consume pattern.

-- Remove the old non-unique index first (if it still exists after the 0017 migration).
DROP INDEX IF EXISTS idx_login_attempts_email;

-- Remove duplicate rows before adding constraint, keeping the most recent one per email.
DELETE FROM login_attempts
WHERE id NOT IN (
  SELECT DISTINCT ON (email) id
  FROM login_attempts
  ORDER BY email, updated_at DESC
);

-- Add unique index (equivalent to UNIQUE constraint, skips if already unique).
CREATE UNIQUE INDEX IF NOT EXISTS idx_login_attempts_email_unique
  ON login_attempts (email);

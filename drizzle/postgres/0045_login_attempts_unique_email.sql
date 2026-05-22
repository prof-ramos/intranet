-- F-001: Add unique constraint on login_attempts.email_hash to prevent race-condition
-- duplicate rows and enable atomic INSERT...ON CONFLICT DO UPDATE consume pattern.
-- The legacy email column is kept nullable for migration compatibility; new writes
-- store only email_hash so login identifiers are not persisted in cleartext.

-- Remove old indexes first (if they still exist after earlier migrations).
DROP INDEX IF EXISTS idx_login_attempts_email;
DROP INDEX IF EXISTS idx_login_attempts_email_hash;
DROP INDEX IF EXISTS idx_login_attempts_email_unique;

ALTER TABLE login_attempts
  ALTER COLUMN email DROP NOT NULL;

-- Preserve duplicate rows removed while enforcing uniqueness for hashed identifiers.
CREATE TABLE IF NOT EXISTS login_attempts_dedup_backup (
  id bigint PRIMARY KEY,
  email text,
  email_hash text,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now(),
  backup_reason text NOT NULL
);

WITH duplicate_rows AS (
  SELECT *
  FROM (
    SELECT
      login_attempts.*,
      row_number() OVER (
        PARTITION BY email_hash
        ORDER BY updated_at DESC, id DESC
      ) AS duplicate_rank
    FROM login_attempts
    WHERE email_hash IS NOT NULL
  ) ranked
  WHERE duplicate_rank > 1
),
backed_up AS (
  INSERT INTO login_attempts_dedup_backup (
    id,
    email,
    email_hash,
    attempts,
    expires_at,
    created_at,
    updated_at,
    backup_reason
  )
  SELECT
    id,
    email,
    email_hash,
    attempts,
    expires_at,
    created_at,
    updated_at,
    'duplicate email_hash before unique index'
  FROM duplicate_rows
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
DELETE FROM login_attempts
WHERE id IN (SELECT id FROM duplicate_rows)
  AND (SELECT count(*) FROM backed_up) >= 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_login_attempts_email_hash_unique
  ON login_attempts (email_hash)
  WHERE email_hash IS NOT NULL;

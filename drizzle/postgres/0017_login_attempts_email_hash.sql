ALTER TABLE login_attempts
  ADD COLUMN IF NOT EXISTS email_hash text;

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_hash
  ON login_attempts USING btree (email_hash);

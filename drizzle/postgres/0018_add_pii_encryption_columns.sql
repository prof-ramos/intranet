-- Add PII encryption columns for CPF and SIAPE (US-W1.1)
-- These nullable columns support a gradual backfill: existing rows keep plaintext in
-- cpf/siape while new/updated rows get encrypted values in cpf_ciphertext/siape_ciphertext
-- and HMAC blind indexes in cpf_hash/siape_hash for lookups.

ALTER TABLE associates
  ADD COLUMN IF NOT EXISTS cpf_ciphertext text,
  ADD COLUMN IF NOT EXISTS cpf_hash text,
  ADD COLUMN IF NOT EXISTS siape_ciphertext text,
  ADD COLUMN IF NOT EXISTS siape_hash text;

CREATE INDEX IF NOT EXISTS idx_associates_cpf_hash
  ON associates USING btree (cpf_hash);

CREATE INDEX IF NOT EXISTS idx_associates_siape_hash
  ON associates USING btree (siape_hash);
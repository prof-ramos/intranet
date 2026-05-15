ALTER TABLE associates ADD COLUMN primary_email_ciphertext text;
ALTER TABLE associates ADD COLUMN primary_email_hash text;
ALTER TABLE associates ADD COLUMN phone_ciphertext text;
ALTER TABLE associates ADD COLUMN phone_hash text;
ALTER TABLE associates ADD COLUMN address_ciphertext text;
ALTER TABLE associates ADD COLUMN address_hash text;
ALTER TABLE associates ADD COLUMN whatsapp_ciphertext text;
ALTER TABLE associates ADD COLUMN whatsapp_hash text;

CREATE INDEX idx_associates_primary_email_hash ON associates (primary_email_hash) WHERE primary_email_hash IS NOT NULL;
CREATE INDEX idx_associates_phone_hash ON associates (phone_hash) WHERE phone_hash IS NOT NULL;
CREATE INDEX idx_associates_address_hash ON associates (address_hash) WHERE address_hash IS NOT NULL;
CREATE INDEX idx_associates_whatsapp_hash ON associates (whatsapp_hash) WHERE whatsapp_hash IS NOT NULL;
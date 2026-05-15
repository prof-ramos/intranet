DROP INDEX IF EXISTS idx_integration_api_keys_active;
CREATE INDEX idx_integration_api_keys_active ON integration_api_keys (id) WHERE is_active = true;

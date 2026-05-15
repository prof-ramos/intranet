-- W3.8: Create PII-safe views for list queries
-- These views exclude sensitive columns (cpf, siape, address, phone, whatsapp, primary_email, source_payload)
-- so that list queries never accidentally expose PII

CREATE OR REPLACE VIEW associates_list_view AS
SELECT
  id,
  full_name,
  assignment,
  class_pattern,
  association_status,
  functional_status,
  contribution_status,
  location_country,
  location_city,
  created_at,
  updated_at
FROM associates;
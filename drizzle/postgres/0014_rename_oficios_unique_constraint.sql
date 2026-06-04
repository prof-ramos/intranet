-- Alinha o nome do unique constraint de oficios com o Drizzle schema.
-- O baseline criou oficios_assinafy_document_id_key (auto-nomeado pelo PostgreSQL).
-- O Drizzle schema espera oficios_assinafy_document_id_unique.
-- Esta migration é idempotente: funciona se o banco estiver em qualquer estado intermediário.
DO $$
DECLARE
  has_key boolean;
  has_unique boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'oficios_assinafy_document_id_key'
    AND conrelid = 'oficios'::regclass
  ) INTO has_key;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'oficios_assinafy_document_id_unique'
    AND conrelid = 'oficios'::regclass
  ) INTO has_unique;

  IF has_key AND NOT has_unique THEN
    -- Estado normal: renomeia o constraint antigo
    ALTER TABLE oficios
    RENAME CONSTRAINT oficios_assinafy_document_id_key
    TO oficios_assinafy_document_id_unique;
  ELSIF has_key AND has_unique THEN
    -- Estado inconsistente (ambos existem, ex: push anterior + migration manual)
    -- Dropa o antigo e mantém o novo
    ALTER TABLE oficios
    DROP CONSTRAINT oficios_assinafy_document_id_key;
  ELSIF NOT has_unique THEN
    -- Nenhum dos dois existe: cria explicitamente
    ALTER TABLE oficios
    ADD CONSTRAINT oficios_assinafy_document_id_unique
    UNIQUE (assinafy_document_id);
  END IF;
END $$;

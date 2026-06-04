ALTER TABLE email_triagens
  DROP CONSTRAINT IF EXISTS chk_email_triagens_juridico_validacao,
  DROP CONSTRAINT IF EXISTS chk_email_triagens_risco_validacao,
  DROP CONSTRAINT IF EXISTS chk_email_triagens_confianca_validacao;

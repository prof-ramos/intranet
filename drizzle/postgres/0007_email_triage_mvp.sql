DO $$ BEGIN
    CREATE TYPE email_categoria AS ENUM ('juridico', 'administrativo', 'financeiro', 'institucional', 'comunicacao', 'irrelevante');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE email_tipo_prazo AS ENUM ('processual', 'administrativo', 'contratual', 'financeiro', 'reuniao', 'resposta', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE email_nivel_risco AS ENUM ('baixo', 'medio', 'alto', 'critico');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE email_confianca AS ENUM ('baixa', 'media', 'alta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE email_responsavel AS ENUM ('juridico', 'administrativo', 'financeiro', 'diretoria');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE email_status_triagem AS ENUM (
        'novo',
        'analisado',
        'aguardando_validacao',
        'validado',
        'em_andamento',
        'concluido',
        'vencido',
        'arquivado',
        'erro_validacao_ia',
        'erro_processamento_anexo',
        'aguardando_reprocessamento',
        'descartado_por_irrelevancia',
        'pendente_validacao_lgpd'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS email_triagens (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    message_id VARCHAR(255) NOT NULL UNIQUE,
    thread_id VARCHAR(255) NOT NULL,
    history_id VARCHAR(255),
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sender VARCHAR(512) NOT NULL,
    original_recipient VARCHAR(512),
    subject VARCHAR(1000) NOT NULL,
    body_hash CHAR(64) NOT NULL,
    body_excerpt TEXT NOT NULL,
    raw_body_stored BOOLEAN NOT NULL DEFAULT FALSE,
    redaction_applied BOOLEAN NOT NULL DEFAULT TRUE,
    categoria email_categoria NOT NULL,
    resumo TEXT NOT NULL,
    thread_context_summary TEXT,
    ha_prazo BOOLEAN NOT NULL DEFAULT FALSE,
    prazo_data DATE,
    prazo_hora TIME,
    prazo_confianca_data email_confianca,
    tipo_prazo email_tipo_prazo,
    trecho_fonte_do_prazo TEXT,
    resumo_anexos JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    attachments_hashes JSONB NOT NULL DEFAULT '[]'::jsonb,
    nivel_risco email_nivel_risco NOT NULL,
    confianca email_confianca NOT NULL,
    acao_recomendada TEXT NOT NULL,
    responsavel_sugerido email_responsavel,
    exige_validacao_humana BOOLEAN NOT NULL DEFAULT TRUE,
    legal_basis VARCHAR(100) NOT NULL DEFAULT 'avaliacao_humana_necessaria',
    processed_purpose VARCHAR(255) NOT NULL,
    data_retention_until TIMESTAMP WITH TIME ZONE,
    processing_version VARCHAR(100) NOT NULL DEFAULT 'email-controller-mvp-v1',
    model_name VARCHAR(255),
    model_response_id VARCHAR(255),
    status email_status_triagem NOT NULL DEFAULT 'novo',
    usuario_validador_id BIGINT REFERENCES admins(id) ON DELETE SET NULL,
    validated_at TIMESTAMP WITH TIME ZONE,
    observacoes_validacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_email_triagens_body_hash_sha256
        CHECK (body_hash ~ '^[a-f0-9]{64}$'),
    CONSTRAINT chk_email_triagens_body_excerpt_len
        CHECK (char_length(body_excerpt) <= 600),
    CONSTRAINT chk_email_triagens_prazo_data_conf
        CHECK (prazo_data IS NULL OR prazo_confianca_data IS NOT NULL),
    CONSTRAINT chk_email_triagens_sem_prazo_sem_tipo
        CHECK (
            ha_prazo = TRUE OR (
                prazo_data IS NULL
                AND prazo_hora IS NULL
                AND prazo_confianca_data IS NULL
                AND tipo_prazo IS NULL
                AND trecho_fonte_do_prazo IS NULL
            )
        ),
    CONSTRAINT chk_email_triagens_prazo_com_evidencia
        CHECK (ha_prazo = FALSE OR jsonb_array_length(source_evidence) > 0),
    CONSTRAINT chk_email_triagens_juridico_validacao
        CHECK (categoria <> 'juridico' OR exige_validacao_humana = TRUE),
    CONSTRAINT chk_email_triagens_risco_validacao
        CHECK (nivel_risco NOT IN ('alto', 'critico') OR exige_validacao_humana = TRUE),
    CONSTRAINT chk_email_triagens_confianca_validacao
        CHECK (confianca = 'alta' OR exige_validacao_humana = TRUE)
);

CREATE INDEX IF NOT EXISTS idx_email_triagens_thread_id ON email_triagens(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_triagens_history_id ON email_triagens(history_id);
CREATE INDEX IF NOT EXISTS idx_email_triagens_status ON email_triagens(status);
CREATE INDEX IF NOT EXISTS idx_email_triagens_received_at ON email_triagens(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_triagens_prazo_data ON email_triagens(prazo_data) WHERE ha_prazo = TRUE AND prazo_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_triagens_exige_validacao ON email_triagens(exige_validacao_humana) WHERE exige_validacao_humana = TRUE;
CREATE INDEX IF NOT EXISTS idx_email_triagens_source_evidence_gin ON email_triagens USING GIN (source_evidence);
CREATE INDEX IF NOT EXISTS idx_email_triagens_resumo_anexos_gin ON email_triagens USING GIN (resumo_anexos);

CREATE OR REPLACE FUNCTION update_email_triagens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_email_triagens_updated_at ON email_triagens;

CREATE TRIGGER trigger_update_email_triagens_updated_at
    BEFORE UPDATE ON email_triagens
    FOR EACH ROW
    EXECUTE FUNCTION update_email_triagens_updated_at();

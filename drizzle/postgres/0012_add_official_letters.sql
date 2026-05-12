-- 0012_add_official_letters.sql

-- 1. Update audit_entity_type enum
-- We use DO block to handle cases where the value might already exist
DO $$ BEGIN
    ALTER TYPE audit_entity_type ADD VALUE 'official_letter';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create official_letter_status enum
DO $$ BEGIN
    CREATE TYPE official_letter_status AS ENUM ('gerado', 'cancelado', 'rascunho');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create oficios table
CREATE TABLE IF NOT EXISTS oficios (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    number text NOT NULL UNIQUE,
    year integer NOT NULL,
    sequence integer NOT NULL,
    recipient text NOT NULL,
    recipient_role text NOT NULL,
    vocativo text NOT NULL,
    letter_date text NOT NULL,
    subject text NOT NULL,
    itamaraty_sector text NOT NULL,
    signatory_name text NOT NULL,
    signatory_role text NOT NULL,
    closure text NOT NULL DEFAULT 'Atenciosamente,',
    body_rich_text text NOT NULL,
    body_plain_text text NOT NULL,
    pdf_storage_path text,
    status official_letter_status NOT NULL DEFAULT 'gerado',
    created_by bigint NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
    updated_by bigint REFERENCES admins(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Constraints and Indexes
ALTER TABLE oficios ADD CONSTRAINT uq_oficios_year_sequence UNIQUE (year, sequence);
CREATE INDEX IF NOT EXISTS idx_oficios_year ON oficios (year);
CREATE INDEX IF NOT EXISTS idx_oficios_status ON oficios (status);
CREATE INDEX IF NOT EXISTS idx_oficios_created_at ON oficios (created_at);

-- 5. Enable RLS (Defense-in-depth)
ALTER TABLE oficios ENABLE ROW LEVEL SECURITY;
CREATE POLICY oficios_all ON oficios FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

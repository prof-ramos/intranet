-- Create the assinafy_document_status enum
CREATE TYPE assinafy_document_status AS ENUM (
  'uploading',
  'uploaded',
  'metadata_processing',
  'metadata_ready',
  'pending_signature',
  'certificating',
  'certificated',
  'expired',
  'rejected_by_signer',
  'rejected_by_user',
  'failed'
);

-- Add Assinafy columns to oficios table
ALTER TABLE oficios
ADD COLUMN assinafy_document_id TEXT UNIQUE,
ADD COLUMN assinafy_status assinafy_document_status,
ADD COLUMN assinafy_assignment_id TEXT,
ADD COLUMN assinafy_signer_id TEXT,
ADD COLUMN assinafy_sent_at TIMESTAMPTZ,
ADD COLUMN assinafy_signed_at TIMESTAMPTZ,
ADD COLUMN assinafy_error TEXT;

-- Create indexes
CREATE INDEX idx_oficios_assinafy_document_id ON oficios(assinafy_document_id);
CREATE INDEX idx_oficios_assinafy_status ON oficios(assinafy_status);
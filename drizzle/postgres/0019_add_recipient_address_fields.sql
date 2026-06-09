-- Migration: add optional recipient address fields to oficios
ALTER TABLE "oficios"
  ADD COLUMN IF NOT EXISTS "recipient_address" text,
  ADD COLUMN IF NOT EXISTS "recipient_city" text,
  ADD COLUMN IF NOT EXISTS "recipient_zip" text;

-- Migration: 0051_add_app_settings
-- Creates the app_settings table for admin-configurable application settings,
-- starting with the Gemini API key (key = 'gemini_api_key').

CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" text PRIMARY KEY,
  "value_ciphertext" text NOT NULL,
  "updated_by" bigint NOT NULL REFERENCES "admins"("id") ON DELETE RESTRICT,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_app_settings_updated_by" ON "app_settings" ("updated_by");

-- RLS: only admin-role sessions can read or write app_settings.
-- is_admin_role() resolves the current session's role via get_current_admin_role()
-- (defined in 0039a_rls_helpers.sql), which reads the JWT-verified email from
-- auth.jwt() (Supabase) or the request.jwt.claims GUC (local/CI fallback).
-- Application-layer defence-in-depth: requireRole(['admin']) is also enforced
-- in the server action before any DB access.
ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_settings" FORCE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_admin_only" ON "app_settings"
  FOR ALL
  TO authenticated
  USING (is_admin_role())
  WITH CHECK (is_admin_role());


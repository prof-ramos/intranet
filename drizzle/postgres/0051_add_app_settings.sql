-- Migration: 0051_add_app_settings
-- Creates the app_settings table for admin-configurable application settings,
-- starting with the Gemini API key (key = 'gemini_api_key').

CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" text PRIMARY KEY,
  "value_ciphertext" text NOT NULL,
  "updated_by" bigint NOT NULL REFERENCES "admins"("id") ON DELETE RESTRICT,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- RLS: only the application role (authenticated) can access settings
ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_settings" FORCE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_authenticated" ON "app_settings"
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

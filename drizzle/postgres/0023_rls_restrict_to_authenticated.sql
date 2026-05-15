-- W2.8: Change RLS policies from TO PUBLIC to TO authenticated
-- This blocks unauthenticated (anon) access at the DB level
-- All current policies use: TO PUBLIC USING(true) WITH CHECK(true)
-- We change them to: TO authenticated USING(true) WITH CHECK(true)
-- Additionally, FORCE ROW LEVEL SECURITY on all tables so even the table owner is subject to policies

-- List all tables with RLS policies that use TO PUBLIC
-- Generate ALTER POLICY statements for each

DO $$
DECLARE
  pol RECORD;
  tbl TEXT;
  pol_name TEXT;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE roles = '{public}'
  LOOP
    -- Build new role list
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated',
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Force RLS on all application tables (even table owner subject to policies)
ALTER TABLE admins FORCE ROW LEVEL SECURITY;
ALTER TABLE associates FORCE ROW LEVEL SECURITY;
ALTER TABLE activities FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE login_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE rate_limits FORCE ROW LEVEL SECURITY;
ALTER TABLE legal_consultations FORCE ROW LEVEL SECURITY;
ALTER TABLE legal_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE legal_processes FORCE ROW LEVEL SECURITY;
ALTER TABLE legal_opinions FORCE ROW LEVEL SECURITY;
ALTER TABLE monthly_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE oficios FORCE ROW LEVEL SECURITY;
ALTER TABLE domain_events FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;
ALTER TABLE integration_api_keys FORCE ROW LEVEL SECURITY;
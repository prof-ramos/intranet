-- Migration 0039c: Granular RLS policies for auxiliary tables
-- Fix VULN-001: Authenticated = Full Access
--
-- Auxiliary tables: monthly_payments, oficios, domain_events,
--                    webhook_subscriptions, webhook_deliveries,
--                    integration_api_keys, login_attempts, rate_limits
--
-- login_attempts_update uses get_jwt_email() helper instead of inline auth.jwt().
--
-- NOTE: Some policies in this migration replace existing ones from earlier
-- migrations (0013 oficios_update, 0015 webhook_*_all, integration_api_keys_all).
-- We DROP IF EXISTS first for those, then CREATE.

-- ============================================================================
-- 1. monthly_payments (new policies)
-- ============================================================================
CREATE POLICY monthly_payments_select ON monthly_payments
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY monthly_payments_manage ON monthly_payments
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

DROP POLICY IF EXISTS monthly_payments_all ON monthly_payments;

-- ============================================================================
-- 2. oficios (replace existing policies from 0013)
-- ============================================================================
DROP POLICY IF EXISTS oficios_all ON oficios;
DROP POLICY IF EXISTS oficios_update ON oficios;

CREATE POLICY oficios_select ON oficios
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY oficios_insert ON oficios
  FOR INSERT TO authenticated
  WITH CHECK (is_staff_role());

CREATE POLICY oficios_update ON oficios
  FOR UPDATE TO authenticated
  USING (is_staff_role())
  WITH CHECK (is_staff_role());

CREATE POLICY oficios_delete ON oficios
  FOR DELETE TO authenticated
  USING (is_privileged_role());

-- ============================================================================
-- 3. domain_events (new policies)
-- ============================================================================
CREATE POLICY domain_events_select ON domain_events
  FOR SELECT TO authenticated
  USING (is_privileged_role());

CREATE POLICY domain_events_insert ON domain_events
  FOR INSERT TO authenticated
  WITH CHECK (is_staff_role());

CREATE POLICY domain_events_update ON domain_events
  FOR UPDATE TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

CREATE POLICY domain_events_delete ON domain_events
  FOR DELETE TO authenticated
  USING (is_admin_role());

DROP POLICY IF EXISTS domain_events_all ON domain_events;

-- ============================================================================
-- 4. webhook_subscriptions (replace existing policy from 0015)
-- ============================================================================
DROP POLICY IF EXISTS webhook_subscriptions_all ON webhook_subscriptions;

CREATE POLICY webhook_subscriptions_all ON webhook_subscriptions
  FOR ALL TO authenticated
  USING (is_admin_role())
  WITH CHECK (is_admin_role());

-- ============================================================================
-- 5. webhook_deliveries (replace existing policy from 0015)
-- ============================================================================
DROP POLICY IF EXISTS webhook_deliveries_all ON webhook_deliveries;

CREATE POLICY webhook_deliveries_all ON webhook_deliveries
  FOR ALL TO authenticated
  USING (is_admin_role())
  WITH CHECK (is_admin_role());

-- ============================================================================
-- 6. integration_api_keys (replace existing policy from 0015)
-- ============================================================================
DROP POLICY IF EXISTS integration_api_keys_all ON integration_api_keys;

CREATE POLICY integration_api_keys_all ON integration_api_keys
  FOR ALL TO authenticated
  USING (is_admin_role())
  WITH CHECK (is_admin_role());

-- ============================================================================
-- 7. login_attempts (new policies)
-- ============================================================================
CREATE POLICY login_attempts_select ON login_attempts
  FOR SELECT TO authenticated
  USING (is_admin_role());

CREATE POLICY login_attempts_insert ON login_attempts
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY login_attempts_update ON login_attempts
  FOR UPDATE TO authenticated
  USING (lower(email) = get_jwt_email() OR is_admin_role())
  WITH CHECK (lower(email) = get_jwt_email() OR is_admin_role());

CREATE POLICY login_attempts_delete ON login_attempts
  FOR DELETE TO authenticated
  USING (is_admin_role());

DROP POLICY IF EXISTS login_attempts_all ON login_attempts;

-- ============================================================================
-- 8. rate_limits (new policies)
-- ============================================================================
CREATE POLICY rate_limits_select ON rate_limits
  FOR SELECT TO authenticated
  USING (is_admin_role());

CREATE POLICY rate_limits_insert ON rate_limits
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY rate_limits_update ON rate_limits
  FOR UPDATE TO authenticated
  USING (is_admin_role())
  WITH CHECK (is_admin_role());

CREATE POLICY rate_limits_delete ON rate_limits
  FOR DELETE TO authenticated
  USING (is_admin_role());

DROP POLICY IF EXISTS rate_limits_all ON rate_limits;

-- ============================================================================
-- 9. Re-assert FORCE ROW LEVEL SECURITY on all tables (defense in depth)
-- ============================================================================
ALTER TABLE admins FORCE ROW LEVEL SECURITY;
ALTER TABLE associates FORCE ROW LEVEL SECURITY;
ALTER TABLE activities FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE legal_consultations FORCE ROW LEVEL SECURITY;
ALTER TABLE legal_processes FORCE ROW LEVEL SECURITY;
ALTER TABLE legal_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE legal_opinions FORCE ROW LEVEL SECURITY;
ALTER TABLE legal_opinion_tags FORCE ROW LEVEL SECURITY;
ALTER TABLE assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE login_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE rate_limits FORCE ROW LEVEL SECURITY;
ALTER TABLE monthly_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE oficios FORCE ROW LEVEL SECURITY;
ALTER TABLE domain_events FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;
ALTER TABLE integration_api_keys FORCE ROW LEVEL SECURITY;

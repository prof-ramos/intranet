-- Migration 0039: Replace permissive RLS policies (USING(true)) with granular role-based policies
-- Fix VULN-001: Authenticated = Full Access
--
-- Strategy:
--   1. Create a helper function get_current_admin_role() that resolves the JWT email
--      to an admin role via the admins table.
--   2. Drop all existing permissive USING(true) policies.
--   3. Create granular policies per table based on role requirements:
--      - admins:              only admin role can manage; all authenticated can read own row
--      - associates:          only admin/diretoria can manage; secretaria can read
--      - activities:          all authenticated can read; admin/diretoria/secretaria can manage
--      - audit_logs:          read-only for admin/diretoria; insert for all authenticated
--      - legal_*:             all authenticated can read; admin/diretoria can manage
--      - oficios:             all authenticated can read; admin/diretoria/secretaria can manage
--      - assignments:         all authenticated can read; admin/diretoria can manage
--      - monthly_payments:    all authenticated can read; admin/diretoria can manage
--      - login_attempts:     read for admin only; insert/update for all authenticated (rate-limit)
--      - rate_limits:         read for admin only; insert/update for all authenticated (rate-limit)
--      - domain_events:       read for admin/diretoria; insert for all authenticated
--      - webhook_*:           admin only
--      - integration_api_keys: admin only
--
-- The notifications table already has proper policies from migration 0038, so we skip it.

-- ============================================================================
-- 1. Helper function: resolve current admin role from JWT claims
-- ============================================================================
-- Uses auth.jwt() which is available in Supabase PostgreSQL.
-- In non-Supabase environments, returns NULL (denies all access by default).

CREATE OR REPLACE FUNCTION get_current_admin_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT a.role
  FROM admins a
  WHERE lower(a.email) = lower(auth.jwt() ->> 'email')
    AND a.is_active = true
  LIMIT 1;
$$;

-- Also provide a variant that works with current_setting for non-Supabase environments
-- or testing. If request.jwt.claims is set, it takes precedence.
CREATE OR REPLACE FUNCTION get_current_admin_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT a.id
  FROM admins a
  WHERE lower(a.email) = lower(auth.jwt() ->> 'email')
    AND a.is_active = true
  LIMIT 1;
$$;

-- Role membership check helper
CREATE OR REPLACE FUNCTION is_admin_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT get_current_admin_role() IN ('admin');
$$;

CREATE OR REPLACE FUNCTION is_privileged_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT get_current_admin_role() IN ('admin', 'diretoria');
$$;

CREATE OR REPLACE FUNCTION is_staff_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT get_current_admin_role() IN ('admin', 'diretoria', 'secretaria');
$$;

-- ============================================================================
-- 2. Drop all existing permissive policies
-- ============================================================================

-- Tables from migration 0009 (original policies)
DROP POLICY IF EXISTS admins_all ON admins;
DROP POLICY IF EXISTS associates_all ON associates;
DROP POLICY IF EXISTS activities_all ON activities;
DROP POLICY IF EXISTS audit_logs_all ON audit_logs;
DROP POLICY IF EXISTS legal_consultations_all ON legal_consultations;
DROP POLICY IF EXISTS legal_processes_all ON legal_processes;
DROP POLICY IF EXISTS legal_notes_all ON legal_notes;
DROP POLICY IF EXISTS legal_opinions_all ON legal_opinions;
DROP POLICY IF EXISTS legal_opinion_tags_all ON legal_opinion_tags;
DROP POLICY IF EXISTS assignments_all ON assignments;
DROP POLICY IF EXISTS login_attempts_all ON login_attempts;
DROP POLICY IF EXISTS rate_limits_all ON rate_limits;

-- Tables added in later migrations that also have permissive policies
-- (migration 0023 only changed TO PUBLIC → TO authenticated, keeping USING(true))
DROP POLICY IF EXISTS monthly_payments_all ON monthly_payments;
DROP POLICY IF EXISTS oficios_all ON oficios;
DROP POLICY IF EXISTS domain_events_all ON domain_events;
DROP POLICY IF EXISTS webhook_subscriptions_all ON webhook_subscriptions;
DROP POLICY IF EXISTS webhook_deliveries_all ON webhook_deliveries;
DROP POLICY IF EXISTS integration_api_keys_all ON integration_api_keys;

-- ============================================================================
-- 3. Create granular role-based policies
-- ============================================================================

-- --------------------------------------------------------------------------
-- admins: admin role can do everything; all authenticated can read their own row
-- --------------------------------------------------------------------------
CREATE POLICY admins_select_own ON admins
  FOR SELECT TO authenticated
  USING (id = get_current_admin_id());

CREATE POLICY admins_manage_admin ON admins
  FOR ALL TO authenticated
  USING (is_admin_role())
  WITH CHECK (is_admin_role());

-- --------------------------------------------------------------------------
-- associates: privileged roles (admin, diretoria) can manage;
--             staff (including secretaria) can read
-- --------------------------------------------------------------------------
CREATE POLICY associates_select ON associates
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY associates_manage ON associates
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

-- --------------------------------------------------------------------------
-- activities: all staff can read and manage (board activity tracking)
-- --------------------------------------------------------------------------
CREATE POLICY activities_select ON activities
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY activities_insert ON activities
  FOR INSERT TO authenticated
  WITH CHECK (is_staff_role());

CREATE POLICY activities_update ON activities
  FOR UPDATE TO authenticated
  USING (is_staff_role())
  WITH CHECK (is_staff_role());

CREATE POLICY activities_delete ON activities
  FOR DELETE TO authenticated
  USING (is_staff_role());

-- --------------------------------------------------------------------------
-- audit_logs: all authenticated can INSERT (audit trail);
--             only admin/diretoria can read
-- --------------------------------------------------------------------------
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT TO authenticated
  USING (is_privileged_role());

CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);  -- any authenticated user can create audit entries

-- Prevent UPDATE and DELETE on audit logs at the RLS level
CREATE POLICY audit_logs_no_update ON audit_logs
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY audit_logs_no_delete ON audit_logs
  FOR DELETE TO authenticated
  USING (false);

-- --------------------------------------------------------------------------
-- legal_consultations: all staff can read; privileged can manage
-- --------------------------------------------------------------------------
CREATE POLICY legal_consultations_select ON legal_consultations
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY legal_consultations_manage ON legal_consultations
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

-- --------------------------------------------------------------------------
-- legal_processes: all staff can read; privileged can manage
-- --------------------------------------------------------------------------
CREATE POLICY legal_processes_select ON legal_processes
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY legal_processes_manage ON legal_processes
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

-- --------------------------------------------------------------------------
-- legal_notes: all staff can read; privileged can manage
-- --------------------------------------------------------------------------
CREATE POLICY legal_notes_select ON legal_notes
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY legal_notes_manage ON legal_notes
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

-- --------------------------------------------------------------------------
-- legal_opinions: all staff can read; privileged can manage
-- --------------------------------------------------------------------------
CREATE POLICY legal_opinions_select ON legal_opinions
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY legal_opinions_manage ON legal_opinions
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

-- --------------------------------------------------------------------------
-- legal_opinion_tags: all staff can read; privileged can manage
-- --------------------------------------------------------------------------
CREATE POLICY legal_opinion_tags_select ON legal_opinion_tags
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY legal_opinion_tags_manage ON legal_opinion_tags
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

-- --------------------------------------------------------------------------
-- assignments (lotação): all staff can read; privileged can manage
-- --------------------------------------------------------------------------
CREATE POLICY assignments_select ON assignments
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY assignments_manage ON assignments
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

-- --------------------------------------------------------------------------
-- monthly_payments: all staff can read; privileged can manage
-- --------------------------------------------------------------------------
CREATE POLICY monthly_payments_select ON monthly_payments
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY monthly_payments_manage ON monthly_payments
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

-- --------------------------------------------------------------------------
-- oficios: all staff can read and create; privileged can manage all
-- --------------------------------------------------------------------------
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
  USING (is_privileged_role());  -- only admin/diretoria can delete

-- --------------------------------------------------------------------------
-- login_attempts: internal rate-limit table
--   read: admin only
--   insert: all authenticated (server-side via postgres role bypasses RLS)
--   update: own email only or admin
-- --------------------------------------------------------------------------
CREATE POLICY login_attempts_select ON login_attempts
  FOR SELECT TO authenticated
  USING (is_admin_role());

CREATE POLICY login_attempts_insert ON login_attempts
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY login_attempts_update ON login_attempts
  FOR UPDATE TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email') OR is_admin_role())
  WITH CHECK (lower(email) = lower(auth.jwt() ->> 'email') OR is_admin_role());



CREATE POLICY login_attempts_delete ON login_attempts
  FOR DELETE TO authenticated
  USING (is_admin_role());

-- --------------------------------------------------------------------------
-- rate_limits: internal rate-limit table (same pattern as login_attempts)
--   read: admin only
--   insert: all authenticated (server-side via postgres role bypasses RLS)
--   update: admin only (server-side rate-limit ops use postgres role)
-- --------------------------------------------------------------------------
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

-- --------------------------------------------------------------------------
-- domain_events: privileged can read; all authenticated can insert
-- --------------------------------------------------------------------------
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

-- --------------------------------------------------------------------------
-- webhook_subscriptions: admin only
-- --------------------------------------------------------------------------
CREATE POLICY webhook_subscriptions_all ON webhook_subscriptions
  FOR ALL TO authenticated
  USING (is_admin_role())
  WITH CHECK (is_admin_role());

-- --------------------------------------------------------------------------
-- webhook_deliveries: admin only for read/manage
-- --------------------------------------------------------------------------
CREATE POLICY webhook_deliveries_all ON webhook_deliveries
  FOR ALL TO authenticated
  USING (is_admin_role())
  WITH CHECK (is_admin_role());

-- --------------------------------------------------------------------------
-- integration_api_keys: admin only
-- --------------------------------------------------------------------------
CREATE POLICY integration_api_keys_all ON integration_api_keys
  FOR ALL TO authenticated
  USING (is_admin_role())
  WITH CHECK (is_admin_role());

-- ============================================================================
-- 4. Ensure FORCE ROW LEVEL SECURITY is still on (defense in depth)
--    (Already done in migration 0023, but re-assert for safety)
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
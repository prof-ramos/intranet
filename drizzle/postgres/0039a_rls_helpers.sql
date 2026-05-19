-- Migration 0039a: RLS helper functions with environment-aware JWT resolution
-- Fix VULN-001: Authenticated = Full Access
--
-- These helpers detect whether auth.jwt() exists (Supabase) and use it when
-- available. In non-Supabase environments (CI, dev local), they fall back to
-- current_setting('request.jwt.claims', true) with NULLIF protection.
--
-- CRITICAL: We NEVER create a stub auth.jwt() — to_regprocedure detects the
-- native function without overwriting it.
--
-- SECURITY DEFINER DEPENDENCY:
--   get_jwt_email(), get_current_admin_role(), and get_current_admin_id() MUST
--   remain SECURITY DEFINER. They query the admins table, which has RLS policies
--   (admins_select_own, admins_manage_admin) that call is_admin_role() /
--   is_privileged_role() / is_staff_role(), which in turn call
--   get_current_admin_role(). Changing these to SECURITY INVOKER would cause
--   infinite recursion on RLS-protected tables.

-- ============================================================================
-- 1. Environment detection + email extraction helper
-- ============================================================================

CREATE OR REPLACE FUNCTION get_jwt_email()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Supabase environment: auth.jwt() is cryptographically verified
  IF to_regprocedure('auth.jwt()') IS NOT NULL THEN
    RETURN lower((auth.jwt() ->> 'email')::TEXT);
  END IF;

  -- Non-Supabase fallback: read from GUC set by application/test harness
  RETURN lower(
    NULLIF(
      current_setting('request.jwt.claims', true),
      ''
    )::jsonb ->> 'email'
  );
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

-- ============================================================================
-- 2. Role resolution helpers
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_admin_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT a.role
  FROM admins a
  WHERE lower(a.email) = get_jwt_email()
    AND a.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_current_admin_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT a.id
  FROM admins a
  WHERE lower(a.email) = get_jwt_email()
    AND a.is_active = true
  LIMIT 1;
$$;

-- Role membership check helpers
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

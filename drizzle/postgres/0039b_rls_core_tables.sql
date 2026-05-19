-- Migration 0039b: Granular RLS policies for core tables (add-before-drop)
-- Fix VULN-001: Authenticated = Full Access
--
-- Core tables: admins, associates, activities, audit_logs,
--              legal_consultations, legal_processes, legal_notes,
--              legal_opinions, legal_opinion_tags, assignments
--
-- Strategy: CREATE new policies first, then DROP old permissive ones.
-- This prevents a zero-policy window under FORCE RLS.

-- ============================================================================
-- 1. admins
-- ============================================================================
CREATE POLICY admins_select_own ON admins
  FOR SELECT TO authenticated
  USING (id = get_current_admin_id());

CREATE POLICY admins_manage_admin ON admins
  FOR ALL TO authenticated
  USING (is_admin_role())
  WITH CHECK (is_admin_role());

DROP POLICY IF EXISTS admins_all ON admins;

-- ============================================================================
-- 2. associates
-- ============================================================================
CREATE POLICY associates_select ON associates
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY associates_manage ON associates
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

DROP POLICY IF EXISTS associates_all ON associates;

-- ============================================================================
-- 3. activities
-- ============================================================================
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

DROP POLICY IF EXISTS activities_all ON activities;

-- ============================================================================
-- 4. audit_logs
-- ============================================================================
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT TO authenticated
  USING (is_privileged_role());

CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY audit_logs_no_update ON audit_logs
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY audit_logs_no_delete ON audit_logs
  FOR DELETE TO authenticated
  USING (false);

DROP POLICY IF EXISTS audit_logs_all ON audit_logs;

-- ============================================================================
-- 5. legal_consultations
-- ============================================================================
CREATE POLICY legal_consultations_select ON legal_consultations
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY legal_consultations_manage ON legal_consultations
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

DROP POLICY IF EXISTS legal_consultations_all ON legal_consultations;

-- ============================================================================
-- 6. legal_processes
-- ============================================================================
CREATE POLICY legal_processes_select ON legal_processes
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY legal_processes_manage ON legal_processes
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

DROP POLICY IF EXISTS legal_processes_all ON legal_processes;

-- ============================================================================
-- 7. legal_notes
-- ============================================================================
CREATE POLICY legal_notes_select ON legal_notes
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY legal_notes_manage ON legal_notes
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

DROP POLICY IF EXISTS legal_notes_all ON legal_notes;

-- ============================================================================
-- 8. legal_opinions
-- ============================================================================
CREATE POLICY legal_opinions_select ON legal_opinions
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY legal_opinions_manage ON legal_opinions
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

DROP POLICY IF EXISTS legal_opinions_all ON legal_opinions;

-- ============================================================================
-- 9. legal_opinion_tags
-- ============================================================================
CREATE POLICY legal_opinion_tags_select ON legal_opinion_tags
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY legal_opinion_tags_manage ON legal_opinion_tags
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

DROP POLICY IF EXISTS legal_opinion_tags_all ON legal_opinion_tags;

-- ============================================================================
-- 10. assignments
-- ============================================================================
CREATE POLICY assignments_select ON assignments
  FOR SELECT TO authenticated
  USING (is_staff_role());

CREATE POLICY assignments_manage ON assignments
  FOR ALL TO authenticated
  USING (is_privileged_role())
  WITH CHECK (is_privileged_role());

DROP POLICY IF EXISTS assignments_all ON assignments;

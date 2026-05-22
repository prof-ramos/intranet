-- F-001 follow-up: protect login_attempts_dedup_backup because it may contain
-- legacy cleartext login identifiers preserved for audit/recovery.

ALTER TABLE login_attempts_dedup_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts_dedup_backup FORCE ROW LEVEL SECURITY;

CREATE POLICY login_attempts_dedup_backup_select ON login_attempts_dedup_backup
  FOR SELECT TO authenticated
  USING (is_admin_role());

CREATE POLICY login_attempts_dedup_backup_insert ON login_attempts_dedup_backup
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_role());

CREATE POLICY login_attempts_dedup_backup_update ON login_attempts_dedup_backup
  FOR UPDATE TO authenticated
  USING (is_admin_role())
  WITH CHECK (is_admin_role());

CREATE POLICY login_attempts_dedup_backup_delete ON login_attempts_dedup_backup
  FOR DELETE TO authenticated
  USING (is_admin_role());

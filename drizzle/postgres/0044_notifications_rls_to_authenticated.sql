-- Align notifications RLS with project convention (0039a/b/c pattern):
-- TO authenticated + get_current_admin_id() + AS RESTRICTIVE + FOR SELECT
-- Previous: TO PUBLIC + EXISTS subquery with auth.jwt() ->> 'email' (migration 0037/0038)
--
-- Note: inactive admins (is_active = false) will lose read access under this
-- policy, matching the 0039 convention enforced by get_current_admin_id().

-- Create new policy first (safe swap — no zero-policy window under FORCE RLS)
CREATE POLICY notifications_select_authenticated ON notifications
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (user_id = get_current_admin_id());

-- Drop old policy
DROP POLICY IF EXISTS notifications_select_own ON notifications;
-- Migration 0040: FORCE ROW LEVEL SECURITY on notifications table
--
-- Migration 0023 applied FORCE ROW LEVEL SECURITY to all tables that existed
-- at the time, but notifications (added in 0037) only received ENABLE ROW LEVEL
-- SECURITY. Without FORCE, the table owner bypasses RLS policies.
-- This is a defense-in-depth measure consistent with all other tables.

ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
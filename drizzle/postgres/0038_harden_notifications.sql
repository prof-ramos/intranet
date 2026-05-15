-- 0014_add_notifications.sql
-- Hardens notifications v1: restrictive browser RLS, no client write policy,
-- and an explicit partial unique dedupe index.

DROP POLICY IF EXISTS notifications_server_manage ON notifications;
DROP POLICY IF EXISTS notifications_select_own ON notifications;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'auth'
          AND p.proname = 'jwt'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY notifications_select_own
                ON notifications
                AS RESTRICTIVE
                FOR SELECT
                TO PUBLIC
                USING (
                    EXISTS (
                        SELECT 1
                        FROM admins
                        WHERE admins.id = notifications.user_id
                          AND lower(admins.email) = lower(auth.jwt() ->> 'email')
                    )
                )
        $policy$;
    ELSE
        CREATE POLICY notifications_select_own
            ON notifications
            AS RESTRICTIVE
            FOR SELECT
            TO PUBLIC
            USING (false);
    END IF;
END $$;

DROP INDEX IF EXISTS idx_notifications_user_dedupe_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedupe_key
    ON notifications (user_id, dedupe_key)
    WHERE dedupe_key IS NOT NULL;

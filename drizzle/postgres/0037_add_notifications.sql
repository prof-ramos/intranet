-- 0013_add_notifications.sql

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'activity.completed',
        'legal_consultation.answered'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_entity_type AS ENUM (
        'activity',
        'legal_consultation'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id bigint NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
    actor_id bigint REFERENCES admins(id) ON DELETE SET NULL,
    type notification_type NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    href text,
    entity_type notification_entity_type,
    entity_id bigint,
    read_at timestamptz,
    metadata jsonb,
    dedupe_key text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at
    ON notifications (user_id, read_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
    ON notifications (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedupe_key
    ON notifications (user_id, dedupe_key)
    WHERE dedupe_key IS NOT NULL;

CREATE OR REPLACE FUNCTION current_request_email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT lower(
    coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      CASE
        WHEN nullif(current_setting('request.jwt.claims', true), '') IS NULL THEN NULL
        ELSE current_setting('request.jwt.claims', true)::jsonb ->> 'email'
      END
    )
  );
$$;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON notifications;
CREATE POLICY notifications_select_own
    ON notifications
    FOR SELECT
    TO PUBLIC
    USING (
      EXISTS (
        SELECT 1
        FROM admins
        WHERE admins.id = notifications.user_id
          AND admins.is_active = true
          AND lower(admins.email) = current_request_email()
      )
    );

DROP POLICY IF EXISTS notifications_server_manage ON notifications;
CREATE POLICY notifications_server_manage
    ON notifications
    FOR ALL
    TO PUBLIC
    USING (current_request_email() IS NULL)
    WITH CHECK (current_request_email() IS NULL);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'GRANT SELECT ON notifications TO authenticated';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

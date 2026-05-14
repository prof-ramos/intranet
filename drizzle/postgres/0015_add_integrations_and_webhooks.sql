-- 0015_add_integrations_and_webhooks.sql
-- Foundation schema for outbound webhooks and integration outbox.

ALTER TYPE audit_entity_type ADD VALUE IF NOT EXISTS 'domain_event';

DO $$ BEGIN
    CREATE TYPE domain_event_type AS ENUM (
        'associate.updated',
        'legal_consultation.created',
        'legal_consultation.status_changed',
        'official_letter.created',
        'monthly_payment.updated',
        'official_letter.published'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TYPE domain_event_type ADD VALUE IF NOT EXISTS 'official_letter.published';

DO $$ BEGIN
    CREATE TYPE domain_event_entity_type AS ENUM (
        'associate',
        'legal_consultation',
        'official_letter',
        'monthly_payment'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE domain_event_delivery_status AS ENUM (
        'pending',
        'processing',
        'delivered',
        'partially_delivered',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE webhook_delivery_status AS ENUM (
        'pending',
        'delivered',
        'failed',
        'retry_scheduled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS domain_events (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    event_type domain_event_type NOT NULL,
    entity_type domain_event_entity_type NOT NULL,
    entity_id bigint NOT NULL,
    actor_admin_id bigint REFERENCES admins(id) ON DELETE SET NULL,
    payload jsonb NOT NULL,
    delivery_status domain_event_delivery_status NOT NULL DEFAULT 'pending',
    occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    target_url text NOT NULL,
    secret_ciphertext text NOT NULL,
    subscribed_events jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    created_by bigint NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
    ALTER TABLE webhook_subscriptions RENAME COLUMN secret TO secret_ciphertext;
EXCEPTION
    WHEN undefined_column THEN null;
    WHEN duplicate_column THEN null;
END $$;

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    domain_event_id bigint NOT NULL REFERENCES domain_events(id) ON DELETE RESTRICT,
    webhook_subscription_id bigint NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE RESTRICT,
    attempt integer NOT NULL DEFAULT 1,
    request_id text NOT NULL,
    status webhook_delivery_status NOT NULL DEFAULT 'pending',
    status_code integer,
    response_excerpt text,
    delivered_at timestamptz,
    next_retry_at timestamptz,
    failed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_api_keys (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    key_hash text NOT NULL,
    scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    last_used_at timestamptz,
    created_by bigint NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domain_events_event_type
  ON domain_events (event_type);

CREATE INDEX IF NOT EXISTS idx_domain_events_entity
  ON domain_events (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_domain_events_actor_admin_id
  ON domain_events (actor_admin_id);

CREATE INDEX IF NOT EXISTS idx_domain_events_delivery_status
  ON domain_events (delivery_status);

CREATE INDEX IF NOT EXISTS idx_domain_events_occurred_at
  ON domain_events (occurred_at);

CREATE INDEX IF NOT EXISTS idx_domain_events_status_occurred_at
  ON domain_events (delivery_status, occurred_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_subscriptions_name_unique
  ON webhook_subscriptions (name);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_target_url
  ON webhook_subscriptions (target_url);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active
  ON webhook_subscriptions (is_active);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_created_by
  ON webhook_subscriptions (created_by);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_deliveries_request_id_unique
  ON webhook_deliveries (request_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_deliveries_subscription_attempt_unique
  ON webhook_deliveries (domain_event_id, webhook_subscription_id, attempt);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_domain_event_id
  ON webhook_deliveries (domain_event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_subscription_id
  ON webhook_deliveries (webhook_subscription_id);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status
  ON webhook_deliveries (status);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status_next_retry_at
  ON webhook_deliveries (status, next_retry_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_api_keys_name_unique
  ON integration_api_keys (name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_api_keys_key_hash_unique
  ON integration_api_keys (key_hash);

CREATE INDEX IF NOT EXISTS idx_integration_api_keys_active
  ON integration_api_keys (is_active);

CREATE INDEX IF NOT EXISTS idx_integration_api_keys_created_by
  ON integration_api_keys (created_by);

ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_api_keys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "domain_events_all"
    ON domain_events
    FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "webhook_subscriptions_all"
    ON webhook_subscriptions
    FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "webhook_deliveries_all"
    ON webhook_deliveries
    FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "integration_api_keys_all"
    ON integration_api_keys
    FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

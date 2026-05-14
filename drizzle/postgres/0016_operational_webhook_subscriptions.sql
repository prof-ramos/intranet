-- 0016_operational_webhook_subscriptions.sql
-- Adds audit coverage and lookup support for managed outbound webhook subscriptions.

ALTER TYPE audit_entity_type ADD VALUE IF NOT EXISTS 'webhook_subscription';

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_subscribed_events
  ON webhook_subscriptions USING gin (subscribed_events);

CREATE INDEX idx_webhook_subscriptions_active_partial ON webhook_subscriptions (id) WHERE is_active = true;

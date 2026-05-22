import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { admins } from './admins';

export const domainEventType = pgEnum('domain_event_type', [
  'associate.updated',
  'legal_consultation.created',
  'legal_consultation.status_changed',
  'official_letter.created',
  'monthly_payment.updated',
  'official_letter.published',
]);

export const domainEventEntityType = pgEnum('domain_event_entity_type', [
  'associate',
  'legal_consultation',
  'official_letter',
  'monthly_payment',
]);

export const domainEventDeliveryStatus = pgEnum('domain_event_delivery_status', [
  'pending',
  'processing',
  'delivered',
  'partially_delivered',
  'failed',
]);

export const webhookDeliveryStatus = pgEnum('webhook_delivery_status', [
  'pending',
  'delivered',
  'failed',
  'retry_scheduled',
]);

export const domainEvents = pgTable(
  'domain_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    eventType: domainEventType('event_type').notNull(),
    entityType: domainEventEntityType('entity_type').notNull(),
    entityId: bigint('entity_id', { mode: 'number' }).notNull(),
    actorAdminId: bigint('actor_admin_id', { mode: 'number' }).references(() => admins.id, {
      onDelete: 'set null',
    }),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    deliveryStatus: domainEventDeliveryStatus('delivery_status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_domain_events_event_type').on(table.eventType),
    index('idx_domain_events_entity').on(table.entityType, table.entityId),
    index('idx_domain_events_actor_admin_id').on(table.actorAdminId),
    index('idx_domain_events_delivery_status').on(table.deliveryStatus),
    index('idx_domain_events_occurred_at').on(table.occurredAt),
    index('idx_domain_events_status_occurred_at').on(table.deliveryStatus, table.occurredAt),
    index('idx_domain_events_expires_at').on(table.expiresAt),
    index('idx_domain_events_pending')
      .on(table.id)
      .where(sql`${table.deliveryStatus} = 'pending'`),
  ],
);

export const webhookSubscriptions = pgTable(
  'webhook_subscriptions',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull(),
    targetUrl: text('target_url').notNull(),
    secretCiphertext: text('secret_ciphertext').notNull(),
    subscribedEvents: jsonb('subscribed_events')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: bigint('created_by', { mode: 'number' })
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('idx_webhook_subscriptions_name_unique').on(table.name),
    index('idx_webhook_subscriptions_target_url').on(table.targetUrl),
    index('idx_webhook_subscriptions_active').on(table.isActive),
    index('idx_webhook_subscriptions_created_by').on(table.createdBy),
    index('idx_webhook_subscriptions_subscribed_events').using('gin', table.subscribedEvents),
    index('idx_webhook_subscriptions_active_partial')
      .on(table.id)
      .where(sql`${table.isActive} = true`),
  ],
);

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    domainEventId: bigint('domain_event_id', { mode: 'number' })
      .notNull()
      .references(() => domainEvents.id, { onDelete: 'restrict' }),
    webhookSubscriptionId: bigint('webhook_subscription_id', { mode: 'number' })
      .notNull()
      .references(() => webhookSubscriptions.id, { onDelete: 'restrict' }),
    attempt: integer('attempt').notNull().default(1),
    requestId: text('request_id').notNull(),
    idempotencyKey: text('idempotency_key'),
    status: webhookDeliveryStatus('status').notNull().default('pending'),
    statusCode: integer('status_code'),
    responseExcerpt: text('response_excerpt'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_webhook_deliveries_request_id_unique').on(table.requestId),
    uniqueIndex('idx_webhook_deliveries_subscription_attempt_unique').on(
      table.domainEventId,
      table.webhookSubscriptionId,
      table.attempt,
    ),
    index('idx_webhook_deliveries_domain_event_id').on(table.domainEventId),
    index('idx_webhook_deliveries_webhook_subscription_id').on(table.webhookSubscriptionId),
    index('idx_webhook_deliveries_status').on(table.status),
    index('idx_webhook_deliveries_status_next_retry_at').on(table.status, table.nextRetryAt),
    check('chk_webhook_deliveries_attempt', sql`${table.attempt} > 0`),
  ],
);

export const integrationApiKeys = pgTable(
  'integration_api_keys',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull(),
    keyHash: text('key_hash').notNull(),
    scopes: jsonb('scopes')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    isActive: boolean('is_active').notNull().default(true),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdBy: bigint('created_by', { mode: 'number' })
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('idx_integration_api_keys_name_unique').on(table.name),
    uniqueIndex('idx_integration_api_keys_key_hash_unique').on(table.keyHash),
    index('idx_integration_api_keys_active')
      .on(table.id)
      .where(sql`${table.isActive} = true`),
    index('idx_integration_api_keys_created_by').on(table.createdBy),
  ],
);

export type DomainEvent = typeof domainEvents.$inferSelect;
export type NewDomainEvent = typeof domainEvents.$inferInsert;

export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
export type NewWebhookSubscription = typeof webhookSubscriptions.$inferInsert;

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;

export type IntegrationApiKey = typeof integrationApiKeys.$inferSelect;
export type NewIntegrationApiKey = typeof integrationApiKeys.$inferInsert;

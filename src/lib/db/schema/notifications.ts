import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { admins } from './admins';

export const notificationType = pgEnum('notification_type', [
  'activity.completed',
  'legal_consultation.answered',
  'activity.assigned',
  'legal_consultation.sla_warning',
]);

export const notificationEntityType = pgEnum('notification_entity_type', [
  'activity',
  'legal_consultation',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    actorId: bigint('actor_id', { mode: 'number' }).references(() => admins.id, {
      onDelete: 'set null',
    }),
    type: notificationType('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    href: text('href'),
    entityType: notificationEntityType('entity_type'),
    entityId: bigint('entity_id', { mode: 'number' }),
    readAt: timestamp('read_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    dedupeKey: text('dedupe_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_notifications_user_read_at').on(table.userId, table.readAt),
    index('idx_notifications_user_created_at').on(table.userId, table.createdAt),
    uniqueIndex('idx_notifications_user_dedupe_key')
      .on(table.userId, table.dedupeKey)
      .where(sql`${table.dedupeKey} is not null`),
  ],
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

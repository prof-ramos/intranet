import { bigint, index, jsonb, pgEnum, pgTable, real, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { admins } from '@/lib/db/schema/admins';
import { associates } from '@/lib/db/schema/associates';

export const activityStatus = pgEnum('activity_status', [
  'a_fazer',
  'em_andamento',
  'aguardando_terceiros',
  'concluido',
]);
export const activityPriority = pgEnum('activity_priority', ['baixa', 'normal', 'alta', 'urgente']);

export const activities = pgTable(
  'activities',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    title: text('title').notNull(),
    description: text('description'),
    status: activityStatus('status').notNull().default('a_fazer'),
    assigneeId: bigint('assignee_id', { mode: 'number' }).references(() => admins.id, {
      onDelete: 'set null',
    }),
    dueDate: timestamp('due_date', { mode: 'string', withTimezone: true }),
    priority: activityPriority('priority').notNull().default('normal'),
    associateId: bigint('associate_id', { mode: 'number' }).references(() => associates.id, {
      onDelete: 'set null',
    }),
    tags: jsonb('tags')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),
    createdBy: bigint('created_by', { mode: 'number' })
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    position: real('position').notNull().default(1000),
  },
  (table) => [
    index('idx_activities_status').on(table.status),
    index('idx_activities_due_date').on(table.dueDate),
    index('idx_activities_status_due_date').on(table.status, table.dueDate),
    index('idx_activities_assignee_id').on(table.assigneeId),
    index('idx_activities_associate_id').on(table.associateId),
    index('idx_activities_created_by').on(table.createdBy),
  ],
);

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

import { sqliteTable, integer, text, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { admins } from '@/lib/db/schema/admins';
import { associates } from '@/lib/db/schema/associates';

export const activities = sqliteTable('activities', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['a_fazer', 'em_andamento', 'aguardando_terceiros', 'concluido'] }).notNull().default('a_fazer'),
  assigneeId: integer('assignee_id', { mode: 'number' }).references(() => admins.id),
  dueDate: text('due_date'),
  priority: text('priority', { enum: ['baixa', 'normal', 'alta', 'urgente'] }).notNull().default('normal'),
  associateId: integer('associate_id', { mode: 'number' }).references(() => associates.id),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
  createdBy: integer('created_by', { mode: 'number' }).notNull().references(() => admins.id),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
  completedAt: text('completed_at'),
  position: real('position').notNull().default(1000),
}, (table) => [
  index('idx_activities_status').on(table.status),
  index('idx_activities_due_date').on(table.dueDate),
  index('idx_activities_status_due_date').on(table.status, table.dueDate),
  index('idx_activities_assignee_id').on(table.assigneeId),
  index('idx_activities_associate_id').on(table.associateId),
  index('idx_activities_created_by').on(table.createdBy),
]);

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

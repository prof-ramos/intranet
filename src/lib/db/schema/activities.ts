import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { admins } from './admins';
import { associates } from './associates';

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
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  completedAt: text('completed_at'),
  position: real('position').notNull().default(1000),
});

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { admins } from './admins';

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  action: text('action').notNull(),
  entityType: text('entity_type', { enum: ['associate', 'admin', 'activity'] }).notNull(),
  entityId: integer('entity_id', { mode: 'number' }).notNull(),
  performedBy: integer('performed_by', { mode: 'number' }).notNull().references(() => admins.id),
  changes: text('changes', { mode: 'json' }).$type<{ old: Record<string, unknown>; new: Record<string, unknown> } | null>(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown> | null>(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

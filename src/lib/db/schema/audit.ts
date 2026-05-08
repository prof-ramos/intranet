import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { admins } from '@/lib/db/schema/admins';

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  action: text('action').notNull(),
  entityType: text('entity_type', { enum: ['associate', 'admin', 'activity'] }).notNull(),
  entityId: integer('entity_id', { mode: 'number' }).notNull(),
  performedBy: integer('performed_by', { mode: 'number' }).references(() => admins.id),
  changes: text('changes', { mode: 'json' }).$type<{ old: Record<string, unknown>; new: Record<string, unknown> } | null>(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown> | null>(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_audit_entity').on(table.entityType, table.entityId),
  index('idx_audit_performed_by').on(table.performedBy),
  index('idx_audit_created_at').on(table.createdAt),
]);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

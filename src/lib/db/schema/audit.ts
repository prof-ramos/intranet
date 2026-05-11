import { bigint, index, jsonb, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { admins } from '@/lib/db/schema/admins';

export const auditEntityType = pgEnum('audit_entity_type', [
  'associate',
  'admin',
  'activity',
  'legal_consultation',
  'legal_process',
]);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    action: text('action').notNull(),
    entityType: auditEntityType('entity_type').notNull(),
    entityId: bigint('entity_id', { mode: 'number' }),
    performedBy: bigint('performed_by', { mode: 'number' }).references(() => admins.id, {
      onDelete: 'set null',
    }),
    changes: jsonb('changes').$type<{
      old: Record<string, unknown>;
      new: Record<string, unknown>;
    } | null>(),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_entity').on(table.entityType, table.entityId),
    index('idx_audit_performed_by').on(table.performedBy),
    index('idx_audit_created_at').on(table.createdAt),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

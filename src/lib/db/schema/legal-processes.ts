import { sql } from 'drizzle-orm';
import { bigint, index, jsonb, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { admins } from '@/lib/db/schema/admins';
import { associates } from '@/lib/db/schema/associates';
import { legalSatisfaction } from '@/lib/db/schema/legal-consultations';

export const legalProcessType = pgEnum('legal_process_type', ['judicial', 'administrativo']);

export const legalProcessSubtype = pgEnum('legal_process_subtype', [
  'justica_federal',
  'stf',
  'mre',
  'cgu',
  'tcu',
]);

export const legalProcessStatus = pgEnum('legal_process_status', ['ativo', 'concluido', 'suspenso']);

export const legalProcesses = pgTable(
  'legal_processes',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    internalNumber: text('internal_number').notNull().unique(),
    externalNumber: text('external_number'),
    title: text('title').notNull(),
    type: legalProcessType('type').notNull(),
    subtype: legalProcessSubtype('subtype').notNull(),
    associateId: bigint('associate_id', { mode: 'number' }).references(() => associates.id, {
      onDelete: 'set null',
    }),
    status: legalProcessStatus('status').notNull().default('ativo'),
    satisfaction: legalSatisfaction('satisfaction'),
    officeDeadline: timestamp('office_deadline', { withTimezone: true }),
    legalDeadline: timestamp('legal_deadline', { withTimezone: true }),
    lastCheckAt: timestamp('last_check_at', { withTimezone: true }),
    attachments: jsonb('attachments')
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
  },
  (table) => [
    index('idx_legal_processes_status').on(table.status),
    index('idx_legal_processes_associate').on(table.associateId),
    index('idx_legal_processes_created_by').on(table.createdBy),
    index('idx_legal_processes_type').on(table.type),
    index('idx_legal_processes_last_check').on(table.lastCheckAt),
  ],
);

export type LegalProcess = typeof legalProcesses.$inferSelect;
export type NewLegalProcess = typeof legalProcesses.$inferInsert;

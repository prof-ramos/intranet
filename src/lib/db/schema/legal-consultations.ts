import { sql } from 'drizzle-orm';
import { bigint, index, jsonb, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { admins } from '@/lib/db/schema/admins';
import { associates } from '@/lib/db/schema/associates';
import { lawyers } from '@/lib/db/schema/lawyers';
import { LEGAL_CONSULTATION_STATUSES } from '@/lib/juridico/status';
import { legalSatisfaction } from './enums';

export const legalConsultationStatus = pgEnum(
  'legal_consultation_status',
  LEGAL_CONSULTATION_STATUSES,
);

export const legalConsultations = pgTable(
  'legal_consultations',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    internalNumber: text('internal_number').notNull().unique(),
    title: text('title').notNull(),
    questionSummary: text('question_summary').notNull(),
    questionFullText: text('question_full_text'),
    associateId: bigint('associate_id', { mode: 'number' }).references(() => associates.id, {
      onDelete: 'set null',
    }),
    answeredBy: bigint('answered_by', { mode: 'number' }).references(() => admins.id, {
      onDelete: 'set null',
    }),
    finalAnswer: text('final_answer'),
    attachments: jsonb('attachments')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),
    slaDueDate: timestamp('sla_due_date', { withTimezone: true }),
    status: legalConsultationStatus('status').notNull().default('aberta'),
    satisfaction: legalSatisfaction('satisfaction'),
    lawyerId: bigint('lawyer_id', { mode: 'number' }).references(() => lawyers.id, {
      onDelete: 'set null',
    }),
    threadId: varchar('thread_id', { length: 255 }),
    lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true }),
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
    index('idx_legal_consultations_status').on(table.status),
    index('idx_legal_consultations_associate').on(table.associateId),
    index('idx_legal_consultations_created_by').on(table.createdBy),
    index('idx_legal_consultations_sla').on(table.slaDueDate),
    index('idx_legal_consultations_last_interaction').on(table.lastInteractionAt),
    index('idx_legal_consultations_created_at').on(table.createdAt),
    index('idx_legal_consultations_lawyer').on(table.lawyerId),
    index('idx_legal_consultations_thread').on(table.threadId),
  ],
);

export type LegalConsultation = typeof legalConsultations.$inferSelect;
export type NewLegalConsultation = typeof legalConsultations.$inferInsert;

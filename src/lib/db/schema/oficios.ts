import {
  bigint,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { admins } from './admins';

export const officialLetterStatus = pgEnum('official_letter_status', [
  'gerado',
  'cancelado',
  'rascunho',
]);

export const assinafyDocumentStatus = pgEnum('assinafy_document_status', [
  'uploading',
  'uploaded',
  'metadata_processing',
  'metadata_ready',
  'pending_signature',
  'certificating',
  'certificated',
  'expired',
  'partially_signed',
  'rejected_by_signer',
  'rejected_by_user',
  'failed',
]);

export const oficios = pgTable(
  'oficios',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    number: text('number').notNull().unique(),
    year: integer('year').notNull(),
    sequence: integer('sequence').notNull(),
    recipient: text('recipient').notNull(),
    recipientRole: text('recipient_role').notNull(),
    vocativo: text('vocativo').notNull(),
    letterDate: text('letter_date').notNull(),
    subject: text('subject').notNull(),
    itamaratySector: text('itamaraty_sector').notNull(),
    signatoryName: text('signatory_name').notNull(),
    signatoryRole: text('signatory_role').notNull(),
    closure: text('closure').notNull().default('Atenciosamente,'),
    bodyRichText: text('body_rich_text').notNull(),
    bodyPlainText: text('body_plain_text').notNull(),
    pdfStoragePath: text('pdf_storage_path'),
    status: officialLetterStatus('status').notNull().default('gerado'),
    createdBy: bigint('created_by', { mode: 'number' })
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    updatedBy: bigint('updated_by', { mode: 'number' }).references(() => admins.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    // Assinafy fields
    assinafyDocumentId: text('assinafy_document_id').unique(),
    assinafyStatus: assinafyDocumentStatus('assinafy_status'),
    assinafyAssignmentId: text('assinafy_assignment_id'),
    assinafySignerId: text('assinafy_signer_id'),
    assinafySentAt: timestamp('assinafy_sent_at', { withTimezone: true }),
    assinafySignedAt: timestamp('assinafy_signed_at', { withTimezone: true }),
    assinafyError: text('assinafy_error'),
    assinafySigningUrl: text('assinafy_signing_url'),
  },
  (table) => [
    unique('uq_oficios_year_sequence').on(table.year, table.sequence),
    index('idx_oficios_year').on(table.year),
    index('idx_oficios_status').on(table.status),
    index('idx_oficios_created_at').on(table.createdAt),
    index('idx_oficios_created_at_desc').on(table.createdAt.desc()),
    index('idx_oficios_created_by').on(table.createdBy),
    index('idx_oficios_updated_by').on(table.updatedBy),
    check('chk_oficios_year', sql`${table.year} between 2000 and 2100`),
    check('chk_oficios_sequence', sql`${table.sequence} > 0`),
  ],
);

export type OfficialLetter = typeof oficios.$inferSelect;
export type NewOfficialLetter = typeof oficios.$inferInsert;

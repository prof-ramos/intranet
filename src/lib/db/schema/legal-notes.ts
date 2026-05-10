import { bigint, index, pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { admins } from '@/lib/db/schema/admins';

export const legalNotes = pgTable(
  'legal_notes',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    entityType: text('entity_type').notNull(),
    entityId: bigint('entity_id', { mode: 'number' }).notNull(),
    content: text('content').notNull(),
    createdBy: bigint('created_by', { mode: 'number' })
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    isEscritorioResponse: boolean('is_escritorio_response').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_legal_notes_entity').on(table.entityType, table.entityId),
    index('idx_legal_notes_created_by').on(table.createdBy),
    index('idx_legal_notes_created_at').on(table.createdAt),
  ],
);

export type LegalNote = typeof legalNotes.$inferSelect;
export type NewLegalNote = typeof legalNotes.$inferInsert;

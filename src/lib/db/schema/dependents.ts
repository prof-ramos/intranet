import { bigint, date, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { associates } from './associates';

/**
 * Dependent family members of associates.
 * Parsed from legacy "Dependentes" free-text field (628 records).
 * Names are NOT encrypted per current policy — they appear in fullName without encryption.
 * relationship is free text (filho(a), conjuge, etc.) — too variable for an enum.
 */
export const dependents = pgTable(
  'dependents',
  {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  associateId: bigint('associate_id', { mode: 'number' })
    .notNull()
    .references(() => associates.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  relationship: text('relationship').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  },
  (table) => [index('idx_dependents_associate_id').on(table.associateId)],
);

export type Dependent = typeof dependents.$inferSelect;
export type NewDependent = typeof dependents.$inferInsert;
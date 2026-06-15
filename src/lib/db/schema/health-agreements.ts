import { bigint, check, date, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { associates } from './associates';

/**
 * Health agreement (convênio) providers linked to associates.
 * Parsed from legacy "Convênios" compound field (324 records).
 * Known providers: SINDITAMARATY, AMIL, ODONTOEMPRESA, ASBAC — others stored as-is.
 * startDate/endDate are nullable because the legacy data does not include them.
 */
export const healthAgreements = pgTable(
  'health_agreements',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    associateId: bigint('associate_id', { mode: 'number' })
      .notNull()
      .references(() => associates.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    startDate: date('start_date', { mode: 'string' }),
    endDate: date('end_date', { mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_health_agreements_associate_id').on(table.associateId),
    check(
      'chk_health_agreements_date_range',
      sql`${table.endDate} IS NULL OR ${table.startDate} IS NULL OR ${table.endDate} >= ${table.startDate}`,
    ),
  ],
);

export type HealthAgreement = typeof healthAgreements.$inferSelect;
export type NewHealthAgreement = typeof healthAgreements.$inferInsert;
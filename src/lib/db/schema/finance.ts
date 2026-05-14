import { bigint, check, index, integer, pgEnum, pgTable, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { associates, paymentMethod } from './associates';
import { admins } from './admins';

export const paymentStatus = pgEnum('payment_status', ['pago', 'pendente', 'atrasado', 'isento']);

export const monthlyPayments = pgTable(
  'monthly_payments',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    associateId: bigint('associate_id', { mode: 'number' })
      .notNull()
      .references(() => associates.id),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    status: paymentStatus('status').notNull().default('pendente'),
    paymentMethod: paymentMethod('payment_method').notNull().default('folha'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    updatedBy: bigint('updated_by', { mode: 'number' }).references(() => admins.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('idx_monthly_payments_unique').on(table.associateId, table.year, table.month),
    index('idx_monthly_payments_status').on(table.status),
    index('idx_monthly_payments_updated_by').on(table.updatedBy),
    index('idx_monthly_payments_year_month_status').on(table.year, table.month, table.status),
    index('idx_monthly_payments_year_month_method').on(table.year, table.month, table.paymentMethod),
    check('chk_monthly_payments_month', sql`${table.month} between 1 and 12`),
    check('chk_monthly_payments_year', sql`${table.year} between 2000 and 2100`),
  ],
);

export type MonthlyPayment = typeof monthlyPayments.$inferSelect;
export type NewMonthlyPayment = typeof monthlyPayments.$inferInsert;

import { pgEnum, pgTable, text, timestamp, bigint } from 'drizzle-orm/pg-core';

export const lawyerStatus = pgEnum('lawyer_status', ['ativo', 'inativo']);

export const lawyers = pgTable('lawyers', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  oab: text('oab'),
  firm: text('firm'),
  specialty: text('specialty'),
  status: lawyerStatus('status').notNull().default('ativo'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Lawyer = typeof lawyers.$inferSelect;
export type NewLawyer = typeof lawyers.$inferInsert;

import { bigint, index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const passwordResetAttempts = pgTable(
  'password_reset_attempts',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    emailHash: text('email_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_password_reset_attempts_email_hash_unique')
      .on(table.emailHash)
      .where(sql`${table.emailHash} IS NOT NULL`),
    index('idx_password_reset_attempts_expires_at').on(table.expiresAt),
  ],
);

export type PasswordResetAttempt = typeof passwordResetAttempts.$inferSelect;
export type NewPasswordResetAttempt = typeof passwordResetAttempts.$inferInsert;

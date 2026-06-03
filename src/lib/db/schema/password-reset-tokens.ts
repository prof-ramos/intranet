import { bigint, index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { admins } from '@/lib/db/schema/admins';

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    adminId: bigint('admin_id', { mode: 'number' })
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_password_reset_tokens_hash_unique').on(table.tokenHash),
    index('idx_password_reset_tokens_admin_id').on(table.adminId),
    index('idx_password_reset_tokens_expires_at').on(table.expiresAt),
  ],
);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

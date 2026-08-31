import { sql } from 'drizzle-orm';
import { bigint, index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { admins } from './admins';

export const operatorMcpTokens = pgTable(
  'operator_mcp_tokens',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    adminId: bigint('admin_id', { mode: 'number' })
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    tokenHash: text('token_hash').notNull(),
    lgpdAcknowledgedAt: timestamp('lgpd_acknowledged_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_operator_mcp_tokens_token_hash_unique').on(table.tokenHash),
    index('idx_operator_mcp_tokens_admin_id').on(table.adminId, table.createdAt),
    index('idx_operator_mcp_tokens_active')
      .on(table.adminId)
      .where(sql`${table.revokedAt} is null`),
  ],
);

export type OperatorMcpToken = typeof operatorMcpTokens.$inferSelect;
export type NewOperatorMcpToken = typeof operatorMcpTokens.$inferInsert;

import { bigint, text, timestamp, pgTable, index } from 'drizzle-orm/pg-core';
import { admins } from './admins';

export const appSettings = pgTable(
  'app_settings',
  {
    key: text('key').primaryKey(),
    valueCiphertext: text('value_ciphertext').notNull(),
    updatedBy: bigint('updated_by', { mode: 'number' })
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_app_settings_updated_by').on(table.updatedBy),
  ]
);

export type AppSetting = typeof appSettings.$inferSelect;

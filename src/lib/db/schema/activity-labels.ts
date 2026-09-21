import { bigint, boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const activityLabels = pgTable(
  'activity_labels',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    colorToken: text('color_token').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_activity_labels_active').on(table.active)],
);

export type ActivityLabel = typeof activityLabels.$inferSelect;
export type NewActivityLabel = typeof activityLabels.$inferInsert;

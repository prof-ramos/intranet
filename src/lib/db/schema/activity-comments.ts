import { sql } from 'drizzle-orm';
import { bigint, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { admins } from './admins';
import { activities } from './activities';

export const activityComments = pgTable(
  'activity_comments',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    activityId: bigint('activity_id', { mode: 'number' })
      .notNull()
      .references(() => activities.id, { onDelete: 'cascade' }),
    authorAdminId: bigint('author_admin_id', { mode: 'number' })
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_activity_comments_activity_created_at').on(table.activityId, table.createdAt.desc()),
    index('idx_activity_comments_activity_id_active')
      .on(table.activityId, table.id.desc())
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export type ActivityComment = typeof activityComments.$inferSelect;
export type NewActivityComment = typeof activityComments.$inferInsert;

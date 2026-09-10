import { bigint, pgTable, primaryKey, timestamp } from 'drizzle-orm/pg-core';
import { activities } from './activities';
import { admins } from './admins';
import { activityLabels } from './activity-labels';

export const activityLabelAssignments = pgTable(
  'activity_label_assignments',
  {
    activityId: bigint('activity_id', { mode: 'number' })
      .notNull()
      .references(() => activities.id, { onDelete: 'cascade' }),
    labelId: bigint('label_id', { mode: 'number' })
      .notNull()
      .references(() => activityLabels.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: bigint('created_by', { mode: 'number' })
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
  },
  (table) => [primaryKey({ columns: [table.activityId, table.labelId] })],
);

export type ActivityLabelAssignment = typeof activityLabelAssignments.$inferSelect;
export type NewActivityLabelAssignment = typeof activityLabelAssignments.$inferInsert;

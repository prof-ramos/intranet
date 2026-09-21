import { and, asc, eq, getTableColumns, inArray } from 'drizzle-orm';
import { db, type DbExecutor } from '@/lib/db';
import { activityLabelAssignments } from '@/lib/db/schema/activity-label-assignments';
import { activityLabels, type NewActivityLabel } from '@/lib/db/schema/activity-labels';

export async function findActiveLabels(executor: DbExecutor = db) {
  return executor
    .select()
    .from(activityLabels)
    .where(eq(activityLabels.active, true))
    .orderBy(asc(activityLabels.name));
}

export async function findLabelBySlug(slug: string, executor: DbExecutor = db) {
  const [row] = await executor
    .select()
    .from(activityLabels)
    .where(eq(activityLabels.slug, slug))
    .limit(1);

  return row ?? null;
}

export async function insertLabel(
  input: Pick<NewActivityLabel, 'name' | 'slug' | 'colorToken'>,
  executor: DbExecutor = db,
) {
  const [row] = await executor.insert(activityLabels).values(input).returning();
  return row;
}

export async function deactivateLabel(id: number, executor: DbExecutor = db) {
  const [row] = await executor
    .update(activityLabels)
    .set({ active: false })
    .where(eq(activityLabels.id, id))
    .returning();

  return row ?? null;
}

export async function findLabelsByActivityId(activityId: number, executor: DbExecutor = db) {
  return executor
    .select(getTableColumns(activityLabels))
    .from(activityLabelAssignments)
    .innerJoin(activityLabels, eq(activityLabelAssignments.labelId, activityLabels.id))
    .where(
      and(
        eq(activityLabelAssignments.activityId, activityId),
        eq(activityLabels.active, true),
      ),
    )
    .orderBy(asc(activityLabels.name));
}

export async function findLabelsByActivityIds(activityIds: number[], executor: DbExecutor = db) {
  if (activityIds.length === 0) return [];

  return executor
    .select({
      activityId: activityLabelAssignments.activityId,
      ...getTableColumns(activityLabels),
    })
    .from(activityLabelAssignments)
    .innerJoin(activityLabels, eq(activityLabelAssignments.labelId, activityLabels.id))
    .where(
      and(
        inArray(activityLabelAssignments.activityId, activityIds),
        eq(activityLabels.active, true),
      ),
    )
    .orderBy(asc(activityLabels.name));
}

export async function assignLabelToActivity(
  activityId: number,
  labelId: number,
  createdBy: number,
  executor: DbExecutor = db,
) {
  const [row] = await executor
    .insert(activityLabelAssignments)
    .values({ activityId, labelId, createdBy })
    .returning();

  return row;
}

export async function removeLabelFromActivity(
  activityId: number,
  labelId: number,
  executor: DbExecutor = db,
) {
  const [row] = await executor
    .delete(activityLabelAssignments)
    .where(
      and(
        eq(activityLabelAssignments.activityId, activityId),
        eq(activityLabelAssignments.labelId, labelId),
      ),
    )
    .returning();

  return row ?? null;
}

export async function findActivityLabelAssignment(
  activityId: number,
  labelId: number,
  executor: DbExecutor = db,
) {
  const [row] = await executor
    .select()
    .from(activityLabelAssignments)
    .where(
      and(
        eq(activityLabelAssignments.activityId, activityId),
        eq(activityLabelAssignments.labelId, labelId),
      ),
    )
    .limit(1);

  return row ?? null;
}

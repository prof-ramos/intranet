import { asc, and, eq, isNull, sql } from 'drizzle-orm';
import { db, type DbExecutor } from '@/lib/db';
import { activityComments, type ActivityComment, type NewActivityComment } from '@/lib/db/schema';

export async function insertComment(
  values: Pick<NewActivityComment, 'activityId' | 'authorAdminId' | 'content'>,
  executor: DbExecutor = db,
): Promise<ActivityComment> {
  const [row] = await executor.insert(activityComments).values(values).returning();
  if (!row) throw new Error('Failed to insert activity comment.');
  return row;
}

export async function findCommentById(
  id: number,
  executor: DbExecutor = db,
): Promise<ActivityComment | null> {
  const [row] = await executor
    .select()
    .from(activityComments)
    .where(and(eq(activityComments.id, id), isNull(activityComments.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function findCommentsByActivityId(
  activityId: number,
  executor: DbExecutor = db,
): Promise<ActivityComment[]> {
  return executor
    .select()
    .from(activityComments)
    .where(and(eq(activityComments.activityId, activityId), isNull(activityComments.deletedAt)))
    .orderBy(asc(activityComments.createdAt), asc(activityComments.id));
}

export async function updateComment(
  id: number,
  content: string,
  executor: DbExecutor = db,
): Promise<ActivityComment | null> {
  const [row] = await executor
    .update(activityComments)
    .set({ content, updatedAt: sql`now()` })
    .where(and(eq(activityComments.id, id), isNull(activityComments.deletedAt)))
    .returning();
  return row ?? null;
}

export async function softDeleteComment(
  id: number,
  executor: DbExecutor = db,
): Promise<ActivityComment | null> {
  const [row] = await executor
    .update(activityComments)
    .set({ deletedAt: new Date(), updatedAt: sql`now()` })
    .where(and(eq(activityComments.id, id), isNull(activityComments.deletedAt)))
    .returning();
  return row ?? null;
}

import { db, type DbExecutor } from '@/lib/db';
import { assignments, type NewAssignment } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export interface FindAssignmentByIdResult {
  id: number;
  name: string;
  type: 'nacional' | 'exterior';
  isActive: boolean;
}

export async function findAssignmentById(
  id: number,
  executor: DbExecutor = db,
): Promise<FindAssignmentByIdResult | null> {
  const [row] = await executor
    .select({
      id: assignments.id,
      name: assignments.name,
      type: assignments.type,
      isActive: assignments.isActive,
    })
    .from(assignments)
    .where(eq(assignments.id, id))
    .limit(1);

  return row ?? null;
}

export async function findAssignmentByName(
  name: string,
  executor: DbExecutor = db,
): Promise<{ id: number } | null> {
  const [row] = await executor
    .select({ id: assignments.id })
    .from(assignments)
    .where(eq(assignments.name, name))
    .limit(1);

  return row ?? null;
}

export async function insertAssignment(
  values: NewAssignment,
  executor: DbExecutor = db,
): Promise<{ id: number }> {
  const [inserted] = await executor
    .insert(assignments)
    .values(values)
    .returning({ id: assignments.id });

  return inserted;
}

export async function updateAssignment(
  id: number,
  values: { name: string; type: 'nacional' | 'exterior' },
  executor: DbExecutor = db,
): Promise<void> {
  await executor
    .update(assignments)
    .set({ ...values, updatedAt: sql`now()` })
    .where(eq(assignments.id, id));
}

export async function toggleAssignmentActive(
  id: number,
  executor: DbExecutor = db,
): Promise<{ name: string; isActive: boolean }> {
  const [target] = await executor
    .select({ id: assignments.id, name: assignments.name, isActive: assignments.isActive })
    .from(assignments)
    .where(eq(assignments.id, id))
    .limit(1);

  if (!target) {
    throw new Error(`Lotação com id ${id} não encontrada`);
  }

  const newState = !target.isActive;

  await executor
    .update(assignments)
    .set({ isActive: newState, updatedAt: sql`now()` })
    .where(eq(assignments.id, id));

  return { name: target.name, isActive: newState };
}

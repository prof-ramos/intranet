import { db } from '@/lib/db';
import { assignments } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function findAssignmentByName(name: string) {
  const [row] = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(eq(assignments.name, name))
    .limit(1);
  return row ?? null;
}

export async function findAssignmentById(id: number) {
  const [row] = await db
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

export async function insertAssignment(values: { name: string; type: 'nacional' | 'exterior' }) {
  const [inserted] = await db
    .insert(assignments)
    .values(values)
    .returning({ id: assignments.id });
  return inserted;
}

export async function updateAssignmentById(
  id: number,
  values: { name: string; type: 'nacional' | 'exterior' },
) {
  await db
    .update(assignments)
    .set({ ...values, updatedAt: sql`now()` })
    .where(eq(assignments.id, id));
}

export async function setAssignmentActive(id: number, isActive: boolean) {
  await db
    .update(assignments)
    .set({ isActive, updatedAt: sql`now()` })
    .where(eq(assignments.id, id));
}

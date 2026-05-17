'use server';

import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { assignments, auditLogs } from '@/lib/db/schema';

function parseAssignmentId(formData: FormData): number {
  const raw = formData.get('id')?.toString() ?? '';
  if (!/^\d+$/.test(raw)) {
    return Number.NaN;
  }
  return Number.parseInt(raw, 10);
}

export async function createAssignment(
  _prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const actor = await requireRole(['admin', 'diretoria']);

  const name = formData.get('name')?.toString().trim();
  const type = formData.get('type')?.toString();

  if (!name || name.length < 2) {
    return { success: false, message: 'Nome da lotação é obrigatório (mínimo 2 caracteres).' };
  }

  if (type !== 'domestic' && type !== 'abroad') {
    return { success: false, message: 'Tipo de lotação inválido.' };
  }

  const [existing] = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(eq(assignments.name, name))
    .limit(1);

  if (existing) {
    return { success: false, message: 'Já existe uma lotação com este nome.' };
  }

  const [inserted] = await db
    .insert(assignments)
    .values({ name, type })
    .returning({ id: assignments.id });

  await db.insert(auditLogs).values({
    action: 'assignment_created',
    entityType: 'assignment',
    entityId: inserted.id,
    performedBy: actor.userId,
    changes: { old: {}, new: { name, type } },
  });

  revalidatePath('/app/config/lotacoes');

  return { success: true, message: `Lotação "${name}" criada com sucesso.` };
}

export async function updateAssignment(
  _prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const actor = await requireRole(['admin', 'diretoria']);

  const id = parseAssignmentId(formData);
  const name = formData.get('name')?.toString().trim();
  const type = formData.get('type')?.toString();

  if (!Number.isInteger(id) || id < 1) {
    return { success: false, message: 'Lotação inválida.' };
  }

  if (!name || name.length < 2) {
    return { success: false, message: 'Nome da lotação é obrigatório (mínimo 2 caracteres).' };
  }

  if (type !== 'domestic' && type !== 'abroad') {
    return { success: false, message: 'Tipo de lotação inválido.' };
  }

  const [target] = await db
    .select({ id: assignments.id, name: assignments.name, type: assignments.type })
    .from(assignments)
    .where(eq(assignments.id, id))
    .limit(1);

  if (!target) {
    return { success: false, message: 'Lotação não encontrada.' };
  }

  const [duplicate] = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(eq(assignments.name, name))
    .limit(1);

  if (duplicate && duplicate.id !== id) {
    return { success: false, message: 'Já existe uma lotação com este nome.' };
  }

  await db
    .update(assignments)
    .set({ name, type, updatedAt: sql`now()` })
    .where(eq(assignments.id, id));

  await db.insert(auditLogs).values({
    action: 'assignment_updated',
    entityType: 'assignment',
    entityId: id,
    performedBy: actor.userId,
    changes: {
      old: { name: target.name, type: target.type },
      new: { name, type },
    },
  });

  revalidatePath('/app/config/lotacoes');

  return { success: true, message: `Lotação "${name}" atualizada com sucesso.` };
}

export async function toggleAssignmentActive(
  _prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const actor = await requireRole(['admin', 'diretoria']);

  const id = parseAssignmentId(formData);

  if (!Number.isInteger(id) || id < 1) {
    return { success: false, message: 'Lotação inválida.' };
  }

  const [target] = await db
    .select({ id: assignments.id, name: assignments.name, isActive: assignments.isActive })
    .from(assignments)
    .where(eq(assignments.id, id))
    .limit(1);

  if (!target) {
    return { success: false, message: 'Lotação não encontrada.' };
  }

  const newState = !target.isActive;

  await db
    .update(assignments)
    .set({ isActive: newState, updatedAt: sql`now()` })
    .where(eq(assignments.id, id));

  await db.insert(auditLogs).values({
    action: newState ? 'assignment_activated' : 'assignment_deactivated',
    entityType: 'assignment',
    entityId: id,
    performedBy: actor.userId,
  });

  revalidatePath('/app/config/lotacoes');

  return {
    success: true,
    message: `Lotação "${target.name}" foi ${newState ? 'ativada' : 'desativada'} com sucesso.`,
  };
}

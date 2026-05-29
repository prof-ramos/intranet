import { db, type DbExecutor } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import {
  findAssignmentById,
  findAssignmentByName,
  insertAssignment,
  updateAssignment as updateAssignmentRepo,
  toggleAssignmentActive as toggleAssignmentActiveRepo,
} from './repository';

export interface CreateAssignmentInput {
  name: string;
  type: 'nacional' | 'exterior';
}

export interface UpdateAssignmentInput {
  id: number;
  name: string;
  type: 'nacional' | 'exterior';
}

export interface AssignmentResult {
  success: boolean;
  message: string;
}

export interface DuplicateCheckResult {
  exists: boolean;
  existingId?: number;
}

export async function checkAssignmentDuplicate(
  name: string,
  excludeId?: number,
  executor: DbExecutor = db,
): Promise<DuplicateCheckResult> {
  const existing = await findAssignmentByName(name, executor);

  if (!existing) {
    return { exists: false };
  }

  if (excludeId !== undefined && existing.id === excludeId) {
    return { exists: false };
  }

  return { exists: true, existingId: existing.id };
}

export async function createAssignment(
  input: CreateAssignmentInput,
  performedBy: number,
): Promise<AssignmentResult> {
  return await db.transaction(async (tx) => {
    const duplicate = await checkAssignmentDuplicate(input.name, undefined, tx);
    if (duplicate.exists) {
      return { success: false, message: 'Já existe uma lotação com este nome.' };
    }

    const inserted = await insertAssignment(input, tx);

    await tx.insert(auditLogs).values({
      action: 'assignment_created',
      entityType: 'assignment',
      entityId: inserted.id,
      performedBy,
      changes: { old: {}, new: { name: input.name, type: input.type } },
    });

    return { success: true, message: `Lotação "${input.name}" criada com sucesso.` };
  });
}

export async function updateAssignment(
  input: UpdateAssignmentInput,
  performedBy: number,
): Promise<AssignmentResult> {
  return await db.transaction(async (tx) => {
    const target = await findAssignmentById(input.id, tx);
    if (!target) {
      return { success: false, message: 'Lotação não encontrada.' };
    }

    const duplicate = await checkAssignmentDuplicate(input.name, input.id, tx);
    if (duplicate.exists) {
      return { success: false, message: 'Já existe uma lotação com este nome.' };
    }

    await updateAssignmentRepo(input.id, { name: input.name, type: input.type }, tx);

    await tx.insert(auditLogs).values({
      action: 'assignment_updated',
      entityType: 'assignment',
      entityId: input.id,
      performedBy,
      changes: {
        old: { name: target.name, type: target.type },
        new: { name: input.name, type: input.type },
      },
    });

    return { success: true, message: `Lotação "${input.name}" atualizada com sucesso.` };
  });
}

export async function toggleAssignmentActive(
  id: number,
  performedBy: number,
): Promise<AssignmentResult> {
  return await db.transaction(async (tx) => {
    try {
      const result = await toggleAssignmentActiveRepo(id, tx);

      await tx.insert(auditLogs).values({
        action: result.isActive ? 'assignment_activated' : 'assignment_deactivated',
        entityType: 'assignment',
        entityId: id,
        performedBy,
      });

      return {
        success: true,
        message: `Lotação "${result.name}" foi ${result.isActive ? 'ativada' : 'desativada'} com sucesso.`,
      };
    } catch (e) {
      if (e instanceof Error && e.message.includes('não encontrada')) {
        return { success: false, message: 'Lotação não encontrada.' };
      }
      throw e;
    }
  });
}

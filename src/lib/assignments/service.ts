import { logAuditAction } from '@/lib/audit/service';
import {
  findAssignmentByName,
  findAssignmentById,
  insertAssignment,
  updateAssignmentById,
  setAssignmentActive,
} from './repository';

export class AssignmentNotFoundError extends Error {
  constructor() {
    super('Lotação não encontrada.');
    this.name = 'AssignmentNotFoundError';
  }
}

export class DuplicateAssignmentNameError extends Error {
  constructor() {
    super('Já existe uma lotação com este nome.');
    this.name = 'DuplicateAssignmentNameError';
  }
}

export async function createAssignment(
  name: string,
  type: 'nacional' | 'exterior',
  actorId: number,
): Promise<{ id: number }> {
  const existing = await findAssignmentByName(name);
  if (existing) {
    throw new DuplicateAssignmentNameError();
  }

  const inserted = await insertAssignment({ name, type });

  await logAuditAction({
    adminId: actorId,
    action: 'assignment_created',
    entityType: 'assignment',
    entityId: inserted.id,
    changes: { old: {}, new: { name, type } },
  });

  return inserted;
}

export async function updateAssignment(
  id: number,
  name: string,
  type: 'nacional' | 'exterior',
  actorId: number,
): Promise<void> {
  const target = await findAssignmentById(id);
  if (!target) {
    throw new AssignmentNotFoundError();
  }

  const duplicate = await findAssignmentByName(name);
  if (duplicate && duplicate.id !== id) {
    throw new DuplicateAssignmentNameError();
  }

  await updateAssignmentById(id, { name, type });

  await logAuditAction({
    adminId: actorId,
    action: 'assignment_updated',
    entityType: 'assignment',
    entityId: id,
    changes: {
      old: { name: target.name, type: target.type },
      new: { name, type },
    },
  });
}

export async function toggleAssignmentActive(
  id: number,
  actorId: number,
): Promise<{ name: string; newState: boolean }> {
  const target = await findAssignmentById(id);
  if (!target) {
    throw new AssignmentNotFoundError();
  }

  const newState = !target.isActive;
  await setAssignmentActive(id, newState);

  await logAuditAction({
    adminId: actorId,
    action: newState ? 'assignment_activated' : 'assignment_deactivated',
    entityType: 'assignment',
    entityId: id,
  });

  return { name: target.name, newState };
}

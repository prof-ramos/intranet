import { isActivityPriority, isActivityStatus } from './status';
import type { Priority, Status } from './types';
import { findActivityById, insertActivity, updateActivityById } from './repository';
import { logAuditAction } from '@/lib/audit/service';
import { emitActivityCompleted } from '@/lib/events';

interface CreateActivityInput {
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  assigneeId: number | null;
  associateId: number | null;
  dueDate: string | null;
  tags: string[];
  createdBy: number;
}

interface UpdateActivityInput {
  id: number;
  actorId: number;
  status?: Status;
  priority?: Priority;
  dueDate?: string | null;
  assigneeId?: number | null;
  reassignmentMessage?: string | null;
}

function isValidOptionalId(value: number | null): boolean {
  return value == null || (Number.isInteger(value) && value > 0);
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) =>
          tag
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, ''),
        )
        .filter((tag) => tag.length > 0),
    ),
  );
}

export async function createActivityService(input: CreateActivityInput) {
  if (!input.title.trim()) {
    throw new Error('O título da atividade é obrigatório.');
  }
  if (input.title.length > 255) {
    throw new Error('O título não pode exceder 255 caracteres.');
  }
  if (!isActivityStatus(input.status)) {
    throw new Error('Status de atividade inválido.');
  }
  if (!isActivityPriority(input.priority)) {
    throw new Error('Prioridade de atividade inválida.');
  }
  if (!isValidOptionalId(input.assigneeId)) {
    throw new Error('Responsável inválido.');
  }
  if (!isValidOptionalId(input.associateId)) {
    throw new Error('Associado inválido.');
  }
  if (input.dueDate && Number.isNaN(Date.parse(input.dueDate))) {
    throw new Error('Data de vencimento inválida.');
  }
  if (input.assigneeId !== undefined && !isValidOptionalId(input.assigneeId)) {
    throw new Error('Responsável inválido.');
  }
  if (input.createdBy == null || Number.isNaN(input.createdBy)) {
    throw new Error('Usuário criador inválido.');
  }

  const normalizedTags = normalizeTags(input.tags);
  const created = await insertActivity({
    title: input.title.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    priority: input.priority,
    assigneeId: input.assigneeId,
    associateId: input.associateId,
    dueDate: input.dueDate,
    tags: normalizedTags,
    createdBy: input.createdBy,
  });

  await logAuditAction({
    adminId: input.createdBy,
    action: 'activity_created',
    entityType: 'activity',
    entityId: created.id,
    changes: {
      old: {},
      new: {
        title: created.title,
        status: created.status,
        priority: created.priority,
        assigneeId: created.assigneeId,
        associateId: created.associateId,
        dueDate: created.dueDate,
        tags: created.tags ?? [],
      },
    },
  });

  return created;
}

export async function updateActivityService(input: UpdateActivityInput) {
  if (!Number.isInteger(input.id) || input.id <= 0) {
    throw new Error('Atividade inválida.');
  }
  if (!Number.isInteger(input.actorId) || input.actorId <= 0) {
    throw new Error('Usuário responsável pela alteração inválido.');
  }
  if (input.status !== undefined && !isActivityStatus(input.status)) {
    throw new Error('Status de atividade inválido.');
  }
  if (input.priority !== undefined && !isActivityPriority(input.priority)) {
    throw new Error('Prioridade de atividade inválida.');
  }
  if (input.dueDate && Number.isNaN(Date.parse(input.dueDate))) {
    throw new Error('Data de vencimento inválida.');
  }

  const current = await findActivityById(input.id);
  if (!current) {
    throw new Error('Atividade não encontrada.');
  }

  const nextStatus = input.status ?? current.status;
  const nextPriority = input.priority ?? current.priority;
  const nextDueDate = input.dueDate === undefined ? current.dueDate : input.dueDate;
  const nextAssigneeId = input.assigneeId === undefined ? current.assigneeId : input.assigneeId;
  const nextCompletedAt =
    nextStatus === 'concluido'
      ? current.completedAt ?? new Date()
      : input.status && current.status === 'concluido'
        ? null
        : current.completedAt;

  const updated = await updateActivityById(input.id, {
    status: nextStatus,
    priority: nextPriority,
    dueDate: nextDueDate,
    assigneeId: nextAssigneeId,
    completedAt: nextCompletedAt,
  });

  if (!updated) {
    throw new Error('Falha ao atualizar atividade.');
  }

  await logAuditAction({
    adminId: input.actorId,
    action: 'activity_updated',
    entityType: 'activity',
    entityId: input.id,
    changes: {
      old: {
        status: current.status,
        priority: current.priority,
        dueDate: current.dueDate,
        assigneeId: current.assigneeId,
        completedAt: current.completedAt?.toISOString() ?? null,
      },
      new: {
        status: updated.status,
        priority: updated.priority,
        dueDate: updated.dueDate,
        assigneeId: updated.assigneeId,
        completedAt: updated.completedAt?.toISOString() ?? null,
      },
    },
    metadata: input.reassignmentMessage?.trim()
      ? { reassignmentMessage: input.reassignmentMessage.trim() }
      : undefined,
  });

  if (current.status !== 'concluido' && updated.status === 'concluido') {
    await emitActivityCompleted({
      activityId: updated.id,
      title: updated.title,
      createdBy: input.actorId,
      assigneeId: updated.assigneeId,
      associateId: updated.associateId,
      completedAt: updated.completedAt?.toISOString() ?? new Date().toISOString(),
    });
  }

  return updated;
}

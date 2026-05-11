import { isActivityStatus } from './status';
import type { Priority, Status } from './types';
import { insertActivity } from './repository';

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
  if (input.createdBy == null || Number.isNaN(input.createdBy)) {
    throw new Error('Usuário criador inválido.');
  }

  return insertActivity({
    title: input.title.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    priority: input.priority,
    assigneeId: input.assigneeId,
    associateId: input.associateId,
    dueDate: input.dueDate,
    tags: input.tags,
    createdBy: input.createdBy,
  });
}
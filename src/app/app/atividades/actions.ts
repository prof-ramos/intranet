'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/authorization';
import { AREAS } from '@/lib/activities/constants';
import { listActivityTimeline } from '@/lib/activities/repository';
import { createActivityService, updateActivityService } from '@/lib/activities/service';
import { isActivityStatus } from '@/lib/activities/status';
import type { ActivityTimelineItem, Priority, Status } from '@/lib/activities/types';
import { ACTIVITY_PRIORITIES } from '@/lib/activities/types';

const ACTIVITY_AREA_KEYS = AREAS.map((area) => area.key);

const ACTIVITY_STATUS_LABELS: Record<Status, string> = {
  a_fazer: 'A fazer',
  em_andamento: 'Em andamento',
  aguardando_terceiros: 'Aguardando terceiros',
  concluido: 'Concluído',
};

const ACTIVITY_PRIORITY_LABELS: Record<Priority, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

function describeTimelineEntry(entry: Awaited<ReturnType<typeof listActivityTimeline>>[number]): string {
  if (entry.action === 'activity_created') {
    return 'Atividade criada.';
  }

  if (entry.action === 'activity_updated') {
    const changes = entry.changes;
    if (!changes) return 'Atividade atualizada.';

    const parts: string[] = [];
    const oldStatus = changes.old.status;
    const newStatus = changes.new.status;
    const oldPriority = changes.old.priority;
    const newPriority = changes.new.priority;
    const oldDueDate = changes.old.dueDate;
    const newDueDate = changes.new.dueDate;

    if (oldStatus !== newStatus && typeof newStatus === 'string' && newStatus in ACTIVITY_STATUS_LABELS) {
      parts.push(`status para ${ACTIVITY_STATUS_LABELS[newStatus as Status]}`);
    }
    if (
      oldPriority !== newPriority
      && typeof newPriority === 'string'
      && newPriority in ACTIVITY_PRIORITY_LABELS
    ) {
      parts.push(`prioridade para ${ACTIVITY_PRIORITY_LABELS[newPriority as Priority]}`);
    }
    if (oldDueDate !== newDueDate) {
      parts.push(newDueDate ? 'vencimento atualizado' : 'vencimento removido');
    }
    if (changes.old.assigneeId !== changes.new.assigneeId) {
      parts.push('responsável');
    }

    return parts.length > 0 ? `Alterou ${parts.join(', ')}.` : 'Atividade atualizada.';
  }

  return 'Atividade atualizada.';
}

function parsePositiveOptionalId(value: string | null): number | null {
  if (!value) {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    return Number.NaN;
  }

  return Number.parseInt(value, 10);
}

export async function createActivity(formData: FormData) {
  const user = await requireRole(['admin', 'diretoria', 'secretaria']);

  const title = (formData.get('title') as string) ?? '';
  const description = (formData.get('description') as string | null) ?? null;
  const statusRaw = (formData.get('status') as string) ?? 'a_fazer';
  const priorityRaw = (formData.get('priority') as string) ?? 'normal';
  const assigneeIdRaw = formData.get('assigneeId') as string | null;
  const associateIdRaw = formData.get('associateId') as string | null;
  const dueDate = (formData.get('dueDate') as string | null) ?? null;
  const areaRaw = (formData.get('area') as string | null) ?? null;
  const tagsRaw = (formData.get('tags') as string) ?? '[]';

  if (!isActivityStatus(statusRaw)) {
    throw new Error('Status de atividade inválido.');
  }

  const isValidPriority = (ACTIVITY_PRIORITIES as readonly string[]).includes(priorityRaw);
  if (!isValidPriority) {
    throw new Error('Prioridade de atividade inválida.');
  }

  if (dueDate && isNaN(Date.parse(dueDate))) {
    throw new Error('Data de vencimento inválida.');
  }

  const assigneeId = parsePositiveOptionalId(assigneeIdRaw);
  const associateId = parsePositiveOptionalId(associateIdRaw);

  if (assigneeIdRaw && (typeof assigneeId !== 'number' || !Number.isInteger(assigneeId) || assigneeId <= 0)) {
    throw new Error('Responsável inválido.');
  }

  if (
    associateIdRaw
    && (typeof associateId !== 'number' || !Number.isInteger(associateId) || associateId <= 0)
  ) {
    throw new Error('Associado inválido.');
  }

  let tags: string[] = [];
  try {
    const parsed = JSON.parse(tagsRaw);
    if (Array.isArray(parsed)) {
      tags = parsed.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
    }
  } catch {
    tags = [];
  }

  if (areaRaw && ACTIVITY_AREA_KEYS.includes(areaRaw as (typeof ACTIVITY_AREA_KEYS)[number])) {
    tags = [areaRaw, ...tags];
  }

  await createActivityService({
    title,
    description,
    status: statusRaw as Status,
    priority: priorityRaw as Priority,
    assigneeId,
    associateId,
    dueDate,
    tags,
    createdBy: user.userId,
  });

  revalidatePath('/app/atividades');
}

export async function createQuickActivityAction(input: { title: string; status: string }) {
  const user = await requireRole(['admin', 'diretoria', 'secretaria']);

  if (!input.title.trim()) {
    throw new Error('O título da atividade é obrigatório.');
  }
  if (!isActivityStatus(input.status)) {
    throw new Error('Status de atividade inválido.');
  }

  const created = await createActivityService({
    title: input.title.trim(),
    description: null,
    status: input.status,
    priority: 'normal',
    assigneeId: user.userId,
    associateId: null,
    dueDate: null,
    tags: [],
    createdBy: user.userId,
  });

  revalidatePath('/app/atividades');

  return {
    id: created.id,
    title: created.title,
    description: created.description,
    status: created.status,
    priority: created.priority,
    dueDate: created.dueDate,
    completedAt: created.completedAt?.toISOString() ?? null,
    assigneeId: created.assigneeId,
    assigneeName: user.name,
    associateId: created.associateId,
    associateName: null,
    tags: created.tags ?? [],
    dueOffset: null,
  };
}

export async function updateActivityAction(input: {
  id: number;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  assigneeId?: number | null;
  reassignmentMessage?: string | null;
}) {
  const user = await requireRole(['admin', 'diretoria', 'secretaria']);

  const result = await updateActivityService({
    id: input.id,
    actorId: user.userId,
    status: input.status as Status | undefined,
    priority: input.priority as Priority | undefined,
    dueDate: input.dueDate,
    assigneeId: input.assigneeId,
    reassignmentMessage: input.reassignmentMessage,
  });

  revalidatePath('/app/atividades');

  return {
    id: result.id,
    status: result.status,
    priority: result.priority,
    dueDate: result.dueDate,
    completedAt: result.completedAt?.toISOString() ?? null,
    assigneeId: result.assigneeId,
  };
}

export async function getActivityTimelineAction(id: number): Promise<ActivityTimelineItem[]> {
  await requireRole(['admin', 'diretoria', 'secretaria']);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Atividade inválida.');
  }

  const rows = await listActivityTimeline(id);
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actorName: row.actorName,
    createdAt: row.createdAt.toISOString(),
    summary: describeTimelineEntry(row),
  }));
}

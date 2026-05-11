'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/authorization';
import { createActivityService } from '@/lib/activities/service';
import { isActivityStatus } from '@/lib/activities/status';
import type { Priority, Status } from '@/lib/activities/types';
import { ACTIVITY_PRIORITIES } from '@/lib/activities/types';

export async function createActivity(formData: FormData) {
  const user = await requireRole(['admin', 'diretoria', 'secretaria']);

  const title = (formData.get('title') as string) ?? '';
  const description = (formData.get('description') as string | null) ?? null;
  const statusRaw = (formData.get('status') as string) ?? 'a_fazer';
  const priorityRaw = (formData.get('priority') as string) ?? 'normal';
  const assigneeIdRaw = formData.get('assigneeId') as string | null;
  const associateIdRaw = formData.get('associateId') as string | null;
  const dueDate = (formData.get('dueDate') as string | null) ?? null;
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

  const assigneeId = assigneeIdRaw ? Number(assigneeIdRaw) : null;
  const associateId = associateIdRaw ? Number(associateIdRaw) : null;

  let tags: string[] = [];
  try {
    const parsed = JSON.parse(tagsRaw);
    if (Array.isArray(parsed)) {
      tags = parsed.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
    }
  } catch {
    tags = [];
  }

  await createActivityService({
    title,
    description,
    status: statusRaw as Status,
    priority: priorityRaw as Priority,
    assigneeId: Number.isFinite(assigneeId) ? assigneeId : null,
    associateId: Number.isFinite(associateId) ? associateId : null,
    dueDate,
    tags,
    createdBy: user.userId,
  });

  revalidatePath('/app/atividades');
}
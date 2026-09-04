'use server';

import { defineFormAction, defineServerAction } from '@/lib/server-actions/define-form-action';
import { AREAS } from '@/lib/activities/constants';
import { listActivityTimeline } from '@/lib/activities/repository';
import { createActivityService, updateActivityService } from '@/lib/activities/service';
import { ACTIVITY_PRIORITY_LABELS, ACTIVITY_STATUS_LABELS } from '@/lib/activities/status';
import type { ActivityTimelineItem, Priority, Status } from '@/lib/activities/types';
import { ACTIVITY_PRIORITIES, ACTIVITY_STATUSES } from '@/lib/activities/types';
import { z } from 'zod';

const ACTIVITY_AREA_KEYS = AREAS.map((area) => area.key);
const MAX_ACTIVITY_TITLE_LENGTH = 255;
const MAX_ACTIVITY_DESCRIPTION_LENGTH = 10_000;
const MAX_ACTIVITY_TAGS = 20;
const MAX_ACTIVITY_TAG_LENGTH = 64;
const MAX_REASSIGNMENT_MESSAGE_LENGTH = 2_000;

function optionalPositiveIdSchema(message: string) {
  return z
    .union([z.literal(''), z.string().regex(/^\d+$/, message)])
    .optional()
    .transform((value) => (value ? Number.parseInt(value, 10) : null))
    .refine((value) => value === null || (Number.isSafeInteger(value) && value > 0), message);
}

function parseTags(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

const createActivitySchema = z.object({
  title: z
    .string()
    .refine((value) => value.trim().length > 0, 'O título da atividade é obrigatório.')
    .max(MAX_ACTIVITY_TITLE_LENGTH, 'O título não pode exceder 255 caracteres.'),
  description: z
    .string()
    .max(MAX_ACTIVITY_DESCRIPTION_LENGTH, 'A descrição não pode exceder 10.000 caracteres.')
    .optional()
    .transform((value) => value ?? null),
  status: z.enum(ACTIVITY_STATUSES).default('a_fazer'),
  priority: z.enum(ACTIVITY_PRIORITIES).default('normal'),
  assigneeId: optionalPositiveIdSchema('Responsável inválido.'),
  associateId: optionalPositiveIdSchema('Associado inválido.'),
  dueDate: z
    .string()
    .optional()
    .transform((value) => value || null)
    .refine(
      (value) => value === null || !Number.isNaN(Date.parse(value)),
      'Data de vencimento inválida.',
    ),
  area: z.string().max(100, 'A área não pode exceder 100 caracteres.').optional(),
  tags: z
    .string()
    .max(2_048, 'A lista de tags é muito extensa.')
    .default('[]')
    .transform((value) => parseTags(value))
    .refine((tags) => tags.length <= MAX_ACTIVITY_TAGS, 'A atividade pode ter no máximo 20 tags.')
    .refine(
      (tags) => tags.every((tag) => tag.length <= MAX_ACTIVITY_TAG_LENGTH),
      'Cada tag pode ter no máximo 64 caracteres.',
    ),
});
const quickActivitySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'O título da atividade é obrigatório.')
    .max(MAX_ACTIVITY_TITLE_LENGTH, 'O título não pode exceder 255 caracteres.'),
  status: z.enum(ACTIVITY_STATUSES, { message: 'Status de atividade inválido.' }),
});
const updateActivitySchema = z.object({
  id: z.number().int().positive('Atividade inválida.'),
  status: z.enum(ACTIVITY_STATUSES, { message: 'Status de atividade inválido.' }).optional(),
  priority: z
    .enum(ACTIVITY_PRIORITIES, { message: 'Prioridade de atividade inválida.' })
    .optional(),
  dueDate: z
    .string()
    .nullable()
    .optional()
    .refine(
      (value) => value == null || !Number.isNaN(Date.parse(value)),
      'Data de vencimento inválida.',
    ),
  assigneeId: z.number().int().positive().nullable().optional(),
  reassignmentMessage: z
    .string()
    .max(
      MAX_REASSIGNMENT_MESSAGE_LENGTH,
      'A mensagem de reatribuição não pode exceder 2.000 caracteres.',
    )
    .nullable()
    .optional(),
});
const activityIdSchema = z.number().int().positive('Atividade inválida.');

function describeTimelineEntry(
  entry: Awaited<ReturnType<typeof listActivityTimeline>>[number],
): string {
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

    if (
      oldStatus !== newStatus &&
      typeof newStatus === 'string' &&
      newStatus in ACTIVITY_STATUS_LABELS
    ) {
      parts.push(`status para ${ACTIVITY_STATUS_LABELS[newStatus as Status]}`);
    }
    if (
      oldPriority !== newPriority &&
      typeof newPriority === 'string' &&
      newPriority in ACTIVITY_PRIORITY_LABELS
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

export const createActivity = defineFormAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: createActivitySchema,
  service: async (data, user) => {
    const tags = [...data.tags];
    if (
      data.area &&
      ACTIVITY_AREA_KEYS.includes(data.area as (typeof ACTIVITY_AREA_KEYS)[number])
    ) {
      tags.unshift(data.area);
    }

    await createActivityService({
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assigneeId: data.assigneeId,
      associateId: data.associateId,
      dueDate: data.dueDate,
      tags,
      createdBy: user.userId,
    });
  },
  revalidate: {
    path: '/app/atividades',
    tag: 'dashboard:activities',
  },
});

export const createQuickActivityAction = defineServerAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: quickActivitySchema,
  service: async (input, user) => {
    const created = await createActivityService({
      title: input.title,
      description: null,
      status: input.status,
      priority: 'normal',
      assigneeId: user.userId,
      associateId: null,
      dueDate: null,
      tags: [],
      createdBy: user.userId,
    });

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
  },
  revalidate: {
    path: '/app/atividades',
    tag: 'dashboard:activities',
  },
});

export const updateActivityAction = defineServerAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: updateActivitySchema,
  service: async (input, user) => {
    const result = await updateActivityService({
      id: input.id,
      actorId: user.userId,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate,
      assigneeId: input.assigneeId,
      reassignmentMessage: input.reassignmentMessage,
    });

    return {
      id: result.id,
      status: result.status,
      priority: result.priority,
      dueDate: result.dueDate,
      completedAt: result.completedAt?.toISOString() ?? null,
      assigneeId: result.assigneeId,
    };
  },
  revalidate: {
    path: '/app/atividades',
    tag: 'dashboard:activities',
  },
});

export const getActivityTimelineAction = defineServerAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: activityIdSchema,
  service: async (id: number): Promise<ActivityTimelineItem[]> => {
    const rows = await listActivityTimeline(id);
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      actorName: row.actorName,
      createdAt: row.createdAt.toISOString(),
      summary: describeTimelineEntry(row),
    }));
  },
});

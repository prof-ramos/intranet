'use server';

import {
  defineFormAction,
  defineNoInputServerAction,
  defineServerAction,
} from '@/lib/server-actions/define-form-action';
import { AREAS } from '@/lib/activities/constants';
import { listActivityTimeline } from '@/lib/activities/repository';
import {
  addCommentService,
  deleteCommentService,
  editCommentService,
  listCommentsService,
} from '@/lib/activities/comments-service';
import {
  addLabelToActivityService,
  createLabelService,
  deactivateLabelService,
  listLabelsService,
  removeLabelFromActivityService,
} from '@/lib/activities/labels-service';
import { createActivityService, updateActivityService } from '@/lib/activities/service';
import { ACTIVITY_PRIORITY_LABELS, ACTIVITY_STATUS_LABELS } from '@/lib/activities/status';
import type {
  ActivityCommentItem,
  ActivityLabelItem,
  ActivityTimelineItem,
  Priority,
  Status,
} from '@/lib/activities/types';
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
const commentContentSchema = z
  .string()
  .min(1, 'O comentário é obrigatório.')
  .max(10_000, 'O comentário não pode exceder 10.000 caracteres.');
const addCommentSchema = z.object({
  activityId: activityIdSchema,
  content: commentContentSchema,
});
const editCommentSchema = z.object({
  commentId: z.number().int().positive('Comentário inválido.'),
  content: commentContentSchema,
});
const deleteCommentSchema = z.object({
  commentId: z.number().int().positive('Comentário inválido.'),
});
const createLabelSchema = z.object({
  name: z.string().trim().min(1).max(64),
  colorToken: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor de label inválida.'),
});
const deactivateLabelSchema = z.object({
  id: z.number().int().positive('Label inválida.'),
});
const activityLabelMutationSchema = z.object({
  activityId: activityIdSchema,
  labelId: z.number().int().positive('Label inválida.'),
});

function toActivityCommentItem(
  comment: Awaited<ReturnType<typeof listCommentsService>>[number],
): ActivityCommentItem {
  return {
    id: comment.id,
    activityId: comment.activityId,
    authorAdminId: comment.authorAdminId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

function toActivityLabelItem(
  label: Awaited<ReturnType<typeof listLabelsService>>[number],
): ActivityLabelItem {
  return {
    id: label.id,
    name: label.name,
    slug: label.slug,
    colorToken: label.colorToken,
  };
}

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

  if (entry.action === 'activity_comment_added') return 'Comentário adicionado.';
  if (entry.action === 'activity_comment_edited') return 'Comentário editado.';
  if (entry.action === 'activity_comment_deleted') return 'Comentário excluído.';
  if (entry.action === 'activity_label_added') return 'Label adicionada.';
  if (entry.action === 'activity_label_removed') return 'Label removida.';

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
      labels: [],
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

export const addCommentAction = defineServerAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: addCommentSchema,
  service: async (input, user): Promise<ActivityCommentItem> =>
    toActivityCommentItem(
      await addCommentService({
        activityId: input.activityId,
        authorAdminId: user.userId,
        content: input.content,
      }),
    ),
  revalidate: {
    path: '/app/atividades',
  },
});

export const editCommentAction = defineServerAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: editCommentSchema,
  service: async (input, user): Promise<ActivityCommentItem> =>
    toActivityCommentItem(
      await editCommentService({
        commentId: input.commentId,
        editorAdminId: user.userId,
        content: input.content,
      }),
    ),
  revalidate: {
    path: '/app/atividades',
  },
});

export const updateCommentAction = editCommentAction;

export const deleteCommentAction = defineServerAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: deleteCommentSchema,
  service: async (input, user) => {
    const deleted = await deleteCommentService({
      commentId: input.commentId,
      actorAdminId: user.userId,
    });
    return { id: deleted.id };
  },
  revalidate: {
    path: '/app/atividades',
  },
});

export const listCommentsAction = defineServerAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: activityIdSchema,
  service: async (activityId: number): Promise<ActivityCommentItem[]> => {
    const comments = await listCommentsService(activityId);
    return comments.map(toActivityCommentItem);
  },
});

export const listLabelsAction = defineNoInputServerAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  service: async (): Promise<ActivityLabelItem[]> => {
    const labels = await listLabelsService();
    return labels.map(toActivityLabelItem);
  },
});

export const createLabelAction = defineServerAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: createLabelSchema,
  service: async (input, user): Promise<ActivityLabelItem> => {
    const label = await createLabelService({
      name: input.name,
      colorToken: input.colorToken,
      createdBy: user.userId,
    });
    return toActivityLabelItem(label);
  },
  revalidate: {
    path: '/app/atividades',
  },
});

export const deactivateLabelAction = defineServerAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: deactivateLabelSchema,
  service: async (input, user) => {
    const label = await deactivateLabelService({ id: input.id, actorId: user.userId });
    return { id: label.id, active: label.active };
  },
  revalidate: {
    path: '/app/atividades',
  },
});

export const addLabelAction = defineServerAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: activityLabelMutationSchema,
  service: async (input, user) => {
    const assignment = await addLabelToActivityService({
      activityId: input.activityId,
      labelId: input.labelId,
      actorId: user.userId,
    });
    return { activityId: assignment.activityId, labelId: assignment.labelId };
  },
  revalidate: {
    path: '/app/atividades',
  },
});

export const removeLabelAction = defineServerAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: activityLabelMutationSchema,
  service: async (input, user) => {
    const assignment = await removeLabelFromActivityService({
      activityId: input.activityId,
      labelId: input.labelId,
      actorId: user.userId,
    });
    return { activityId: assignment.activityId, labelId: assignment.labelId };
  },
  revalidate: {
    path: '/app/atividades',
  },
});

import type { NotificationsTx } from '@/lib/notifications/repository';
import { createNotificationFromEvent } from '@/lib/notifications/service';

export const NOTIFICATION_EVENT_TYPES = ['activity.completed', 'legal_consultation.answered'] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];
export type NotificationEntity = 'activity' | 'legal_consultation';

export interface NotificationEventPayload {
  actorId: number;
  recipientId: number;
  entityType: NotificationEntity;
  entityId: number;
  title: string;
  message: string;
  href?: string | null;
  metadata?: Record<string, unknown> | null;
  dedupeKey?: string | null;
}

interface EmitEventOptions {
  tx?: NotificationsTx;
}

type EventHandler = (payload: NotificationEventPayload, options: EmitEventOptions) => Promise<unknown>;

interface ActivityCompletedPayload {
  activityId: number;
  title: string;
  createdBy: number;
  assigneeId: number | null;
  associateId: number | null;
  completedAt: string;
}

const eventHandlers: Record<NotificationEventType, EventHandler> = {
  'activity.completed': (payload, options) => createNotificationFromEvent('activity.completed', payload, options.tx),
  'legal_consultation.answered': (payload, options) =>
    createNotificationFromEvent('legal_consultation.answered', payload, options.tx),
};

export async function emitEvent(
  type: NotificationEventType,
  payload: NotificationEventPayload,
  options: EmitEventOptions = {},
) {
  assertValidPayload(type, payload);

  console.info('[emitEvent]', {
    type,
    actorId: payload.actorId,
    recipientId: payload.recipientId,
    entityType: payload.entityType,
    entityId: payload.entityId,
  });

  return eventHandlers[type](payload, options);
}

export async function emitActivityCompleted(
  payload: ActivityCompletedPayload,
  options: EmitEventOptions = {},
) {
  return emitEvent(
    'activity.completed',
    {
      actorId: payload.createdBy,
      recipientId: payload.createdBy,
      entityType: 'activity',
      entityId: payload.activityId,
      title: 'Atividade concluída',
      message: payload.title.trim()
        ? `A atividade "${payload.title.trim()}" foi concluída.`
        : 'Uma atividade foi concluída.',
      href: '/app/atividades',
      metadata: {
        activityId: payload.activityId,
        assigneeId: payload.assigneeId,
        associateId: payload.associateId,
        completedAt: payload.completedAt,
      },
      dedupeKey: `activity.completed:${payload.activityId}:${payload.createdBy}`,
    },
    options,
  );
}

function assertValidPayload(type: NotificationEventType, payload: NotificationEventPayload) {
  if (!NOTIFICATION_EVENT_TYPES.includes(type)) {
    throw new Error('Tipo de evento inválido.');
  }

  if (!Number.isInteger(payload.actorId) || payload.actorId <= 0) {
    throw new Error('actorId inválido.');
  }
  if (!Number.isInteger(payload.recipientId) || payload.recipientId <= 0) {
    throw new Error('recipientId inválido.');
  }
  if (!Number.isInteger(payload.entityId) || payload.entityId <= 0) {
    throw new Error('entityId inválido.');
  }
  if (!payload.title.trim()) {
    throw new Error('Título da notificação é obrigatório.');
  }
  if (!payload.message.trim()) {
    throw new Error('Mensagem da notificação é obrigatória.');
  }
}

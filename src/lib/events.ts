import type { DbExecutor } from '@/lib/db';
import { createNotification } from '@/lib/notifications/repository';
import { createNotificationFromEvent } from '@/lib/notifications/service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('events');

export const NOTIFICATION_EVENT_TYPES = [
  'activity.completed',
  'legal_consultation.answered',
  'activity.assigned',
  'legal_consultation.sla_warning',
  'lgpd_request',
  'email_triage_pending',
  'oficio.status_changed',
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];
export type NotificationEntity = 'activity' | 'legal_consultation' | 'email_triagem' | 'oficio';

// ─── Per-event-type metadata shapes ───────────────────────────────────

interface ActivityCompletedMetadata {
  activityId: number;
  assigneeId: number | null;
  associateId: number | null;
  completedAt: string;
}

interface ActivityAssignedMetadata {
  activityId: number;
  previousAssigneeId: number | null;
}

interface SlaWarningMetadata {
  consultationId: number;
  slaDueDate: string;
}

interface OficioStatusChangedMetadata {
  previousStatus: string | null;
  newStatus: string;
  documentId: string;
}

type NotificationMetadataByType = {
  'activity.completed': ActivityCompletedMetadata;
  'activity.assigned': ActivityAssignedMetadata;
  'legal_consultation.sla_warning': SlaWarningMetadata;
  'oficio.status_changed': OficioStatusChangedMetadata;
};

export interface NotificationEventPayload {
  actorId: number | null;
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
  tx?: DbExecutor;
}



interface ActivityCompletedPayload {
  activityId: number;
  title: string;
  createdBy: number;
  assigneeId: number | null;
  associateId: number | null;
  completedAt: string;
}

export async function emitEvent<T extends NotificationEventType>(
  type: T,
  payload: Omit<NotificationEventPayload, 'metadata'> & { metadata?: (T extends keyof NotificationMetadataByType ? NotificationMetadataByType[T] : Record<string, unknown>) | null },
  options: EmitEventOptions = {},
) {
  assertValidPayload(type, payload as NotificationEventPayload);

  logger.info('[emitEvent]', {
    type,
    actorId: payload.actorId,
    recipientId: payload.recipientId,
    entityType: payload.entityType,
    entityId: payload.entityId,
  });

  return createNotificationFromEvent(type, payload as NotificationEventPayload, options.tx);
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

interface ActivityAssignedPayload {
  activityId: number;
  title: string;
  actorId: number;
  newAssigneeId: number;
  previousAssigneeId: number | null;
}

export async function emitActivityAssigned(
  payload: ActivityAssignedPayload,
  options: EmitEventOptions = {},
) {
  // Do NOT notify if assigning to yourself
  if (payload.newAssigneeId === payload.actorId) return;

  return emitEvent(
    'activity.assigned',
    {
      actorId: payload.actorId,
      recipientId: payload.newAssigneeId,
      entityType: 'activity',
      entityId: payload.activityId,
      title: 'Atividade atribuída a você',
      message: `A atividade "${payload.title.trim()}" foi atribuída a você.`,
      href: '/app/atividades',
      metadata: {
        activityId: payload.activityId,
        previousAssigneeId: payload.previousAssigneeId,
      },
      dedupeKey: `activity.assigned:${payload.activityId}:${payload.newAssigneeId}`,
    },
    options,
  );
}

interface SlaWarningPayload {
  consultationId: number;
  internalNumber: string;
  title: string;
  slaDueDate: string;
  recipientId: number;
}

export async function emitSlaWarning(payload: SlaWarningPayload, options: EmitEventOptions = {}) {
  const dateSlug = payload.slaDueDate.slice(0, 10);

  logger.info('[emitSlaWarning]', {
    consultationId: payload.consultationId,
    recipientId: payload.recipientId,
    dateSlug,
  });

  // SLA warnings are system-generated: actor === recipient is intentional.
  // Call createNotification directly to bypass the service-layer self-notification guard.
  return createNotification(
    {
      userId: payload.recipientId,
      actorId: null,
      type: 'legal_consultation.sla_warning',
      title: 'SLA de consulta jurídica prestes a vencer',
      message: `A consulta "${payload.title}" (${payload.internalNumber}) vence em ${dateSlug}.`,
      href: `/app/juridico/consultas/${payload.consultationId}`,
      entityType: 'legal_consultation',
      entityId: payload.consultationId,
      metadata: {
        consultationId: payload.consultationId,
        slaDueDate: payload.slaDueDate,
      },
      dedupeKey: `sla_warning:${payload.consultationId}:${dateSlug}`,
    },
    options.tx,
  );
}

function assertValidPayload(type: NotificationEventType, payload: NotificationEventPayload) {
  if (!NOTIFICATION_EVENT_TYPES.includes(type)) {
    throw new Error('Tipo de evento inválido.');
  }

  if (payload.actorId !== null && (!Number.isInteger(payload.actorId) || payload.actorId <= 0)) {
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

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

export interface ActivityCompletedMetadata {
  activityId: number;
  assigneeId: number | null;
  associateId: number | null;
  completedAt: string;
}

export interface ActivityAssignedMetadata {
  activityId: number;
  previousAssigneeId: number | null;
}

export interface SlaWarningMetadata {
  consultationId: number;
  slaDueDate: string;
}

export interface OficioStatusChangedMetadata {
  previousStatus: string | null;
  newStatus: string;
  documentId: string;
}

/**
 * Events that currently carry no structured metadata at emit sites.
 * Using `null` (or omitting the field) is the supported contract.
 */
export type EmptyNotificationMetadata = null;

/**
 * Map of notification event type → typed metadata.
 * Every `NotificationEventType` is covered so emit sites cannot pass open bags.
 */
export type NotificationMetadataByType = {
  'activity.completed': ActivityCompletedMetadata;
  'activity.assigned': ActivityAssignedMetadata;
  'legal_consultation.sla_warning': SlaWarningMetadata;
  'oficio.status_changed': OficioStatusChangedMetadata;
  // No structured metadata today — call sites pass null/omit only
  'legal_consultation.answered': EmptyNotificationMetadata;
  lgpd_request: EmptyNotificationMetadata;
  email_triage_pending: EmptyNotificationMetadata;
};

export type NotificationMetadataFor<T extends NotificationEventType> =
  NotificationMetadataByType[T];

/** Union of all structured metadata shapes (excludes empty/null-only event types). */
export type NotificationMetadata =
  | ActivityCompletedMetadata
  | ActivityAssignedMetadata
  | SlaWarningMetadata
  | OficioStatusChangedMetadata;

export interface NotificationEventPayload {
  actorId: number | null;
  recipientId: number;
  entityType: NotificationEntity;
  entityId: number;
  title: string;
  message: string;
  href?: string | null;
  /** Structured metadata when known; null/undefined when the event has no payload bag. */
  metadata?: NotificationMetadata | null;
  dedupeKey?: string | null;
}

/** Payload for a specific event type with correctly typed metadata. */
export type TypedNotificationEventPayload<T extends NotificationEventType> = Omit<
  NotificationEventPayload,
  'metadata'
> & {
  metadata?: NotificationMetadataFor<T> | null;
};

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
  payload: TypedNotificationEventPayload<T>,
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

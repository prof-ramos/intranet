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

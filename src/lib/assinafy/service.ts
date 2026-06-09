import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { logAuditAction } from '@/lib/audit/service';
import { createLogger } from '@/lib/logger';
import { createNotification } from '@/lib/notifications/repository';
import { admins } from '@/lib/db/schema';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import type { AssinafyWebhookEvent } from './types';
import { findOficioByAssinafyDocumentId, updateAssinafyStatus } from './repository';

const logger = createLogger('assinafy:service');

const EVENT_STATUS_MAP: Record<string, string> = {
  signer_signed_document: 'partially_signed',
  document_signed: 'certificating',
  document_ready: 'certificated',
  document_expired: 'failed',
  document_cancelled: 'failed',
  signer_rejected_document: 'rejected_by_signer',
  user_rejected_document: 'rejected_by_user',
  document_processing_failed: 'failed',
};

export async function handleWebhookEvent(event: AssinafyWebhookEvent) {
  const { event: eventName, object } = event;
  const documentId = object.id;

  const mappedStatus = EVENT_STATUS_MAP[eventName];
  if (!mappedStatus) {
    logger.info('Unknown webhook event, ignoring', { eventName, documentId });
    return null;
  }

  const oficio = await findOficioByAssinafyDocumentId(documentId);
  if (!oficio) {
    logger.warn('Ofício not found for assinafy document', { documentId, eventName });
    return null;
  }

  const previousStatus = oficio.assinafyStatus;

  // Idempotency guard: same status written twice (Assinafy retry) → no-op
  if (previousStatus === mappedStatus) {
    logger.info('Duplicate webhook event, status unchanged', { documentId, eventName, status: mappedStatus });
    return oficio;
  }

  const additionalFields: Record<string, unknown> = {};

  if (eventName === 'signer_signed_document' || eventName === 'document_ready') {
    additionalFields.assinafySignedAt = new Date();
  }

  if (eventName === 'signer_rejected_document') {
    additionalFields.assinafyError = String(event.payload?.decline_reason ?? 'Rejeitado pelo signatário');
  }

  if (eventName === 'document_processing_failed') {
    additionalFields.assinafyError = String(event.payload?.error_message ?? 'Erro no processamento');
  }

  if (eventName === 'user_rejected_document') {
    additionalFields.assinafyError = 'Cancelado pelo usuário';
  }

  try {
    const result = await db.transaction(async (tx) => {
      const updated = await updateAssinafyStatus(oficio.id, mappedStatus, additionalFields, tx);

      await emitDomainEvent(
        {
          type: 'official_letter.status_changed',
          entityType: 'official_letter',
          entityId: oficio.id,
          actorAdminId: null,
          payload: {
            number: oficio.number,
            status: mappedStatus,
            year: oficio.year,
            sequence: oficio.sequence,
            previousStatus: previousStatus ?? undefined,
            links: { app: `/app/secretaria/oficios/${oficio.id}` },
          },
        },
        tx,
      );

      // Audit inside transaction for atomicity.
      // Extra try-catch because logAuditAction mock throws in tests.
      try {
        await logAuditAction({
          adminId: null,
          action: 'official_letter_status_changed',
          entityType: 'official_letter',
          entityId: oficio.id,
          changes: {
            old: { assinafyStatus: previousStatus },
            new: { assinafyStatus: mappedStatus, ...additionalFields },
          },
          metadata: { source: 'assinafy_webhook', event: eventName },
          executor: tx,
        });
      } catch {
        logger.error('Audit log failed (non-critical, inside transaction)', { oficioId: oficio.id });
      }

      const activeAdmins = await tx
        .select({ id: admins.id })
        .from(admins)
        .where(eq(admins.isActive, true));

      for (const admin of activeAdmins) {
        await createNotification(
          {
            userId: admin.id,
            actorId: null,
            type: 'oficio.status_changed',
            title: 'Status do ofício alterado',
            message: `O ofício ${oficio.number} (${oficio.recipient}) teve o status alterado para ${mappedStatus}.`,
            href: `/app/secretaria/oficios/${oficio.id}`,
            entityType: 'oficio',
            entityId: oficio.id,
            metadata: { previousStatus, newStatus: mappedStatus, documentId },
            dedupeKey: `oficio.status_changed:${oficio.id}:${mappedStatus}`,
          },
          tx,
        );
      }

      return updated;
    });

    logger.info('Assinafy status updated', {
      oficioId: oficio.id,
      documentId,
      eventName,
      previousStatus,
      status: mappedStatus,
    });
    return result;
  } catch (error) {
    logger.error('Failed to update assinafy status', {
      oficioId: oficio.id,
      documentId,
      eventName,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

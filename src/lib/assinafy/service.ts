import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { logAuditAction } from '@/lib/audit/service';
import { createLogger } from '@/lib/logger';
import { createNotificationsBatch } from '@/lib/notifications/repository';
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

  try {
    const { result, auditArgs } = await db.transaction(async (tx) => {
      // Re-read inside the transaction to prevent TOCTOU race on concurrent retries.
      const oficio = await findOficioByAssinafyDocumentId(documentId, tx);
      if (!oficio) {
        logger.warn('Ofício not found for assinafy document', { documentId, eventName });
        return { result: null, auditArgs: null };
      }

      const previousStatus = oficio.assinafyStatus;

      // Idempotency guard — inside tx, so no concurrent retry can pass simultaneously.
      if (previousStatus === mappedStatus) {
        logger.info('Duplicate webhook event, status unchanged', { documentId, eventName, status: mappedStatus });
        return { result: oficio, auditArgs: null };
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

      const activeAdmins = await tx
        .select({ id: admins.id })
        .from(admins)
        .where(eq(admins.isActive, true));

      if (activeAdmins.length > 0) {
        const notifications = activeAdmins.map(admin => ({
          userId: admin.id,
          actorId: null,
          type: 'oficio.status_changed' as const,
          title: 'Status do ofício alterado',
          message: `O ofício ${oficio.number} (${oficio.recipient}) teve o status alterado para ${mappedStatus}.`,
          href: `/app/secretaria/oficios/${oficio.id}`,
          entityType: 'oficio' as const,
          entityId: oficio.id,
          metadata: { previousStatus, newStatus: mappedStatus, documentId },
          dedupeKey: `oficio.status_changed:${oficio.id}:${mappedStatus}`,
        }));

        await createNotificationsBatch(notifications, tx);
      }

      return {
        result: updated,
        auditArgs: {
          adminId: null,
          action: 'official_letter_status_changed',
          entityType: 'official_letter' as const,
          entityId: oficio.id,
          changes: {
            old: { assinafyStatus: previousStatus },
            new: { assinafyStatus: mappedStatus, ...additionalFields },
          },
          metadata: { source: 'assinafy_webhook', event: eventName },
        },
      };
    });

    if (result) {
      logger.info('Assinafy status updated', { documentId, eventName });
    }

    // Audit is best-effort and runs AFTER the transaction commits. A failed audit
    // INSERT must not abort the mutation's tx (passing tx as the audit executor poisons
    // the PG tx on failure). Default `db` isolates the audit to its own connection.
    if (auditArgs) {
      try {
        await logAuditAction(auditArgs);
      } catch {
        logger.error('Audit log failed (non-critical)', { oficioId: auditArgs.entityId });
      }
    }

    return result;
  } catch (error) {
    logger.error('Failed to update assinafy status', {
      documentId,
      eventName,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

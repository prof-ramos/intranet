import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { logAuditAction } from '@/lib/audit/service';
import { createLogger } from '@/lib/logger';
import { createNotificationsBatch } from '@/lib/notifications/repository';
import { admins, integrationSignatureNonces } from '@/lib/db/schema';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import { findOfficialLetterByAssinafyDocumentIdForUpdate } from '@/lib/oficios/repository';
import type { AssinafyStatusPatch, AssinafyWebhookEvent } from './types';
import { updateAssinafyStatus } from './repository';

const logger = createLogger('assinafy:service');

const ASSINAFY_NONCE_KEY = 'assinafy';
const WEBHOOK_NONCE_TTL_MS = 24 * 60 * 60 * 1000;

export type AssinafyWebhookResult =
  | {
      status: 'processed';
      entityId: number;
      action: 'official_letter_status_changed';
      actorId: null;
      changedFields: readonly string[];
    }
  | { status: 'duplicate' }
  | { status: 'ignored' }
  | { status: 'failed' }
  | { status: 'invalid' };

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

async function claimWebhookEvent(
  eventId: number,
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<boolean> {
  const expiresAt = new Date(Date.now() + WEBHOOK_NONCE_TTL_MS);
  const [inserted] = await tx
    .insert(integrationSignatureNonces)
    .values({ keyId: ASSINAFY_NONCE_KEY, signature: String(eventId), expiresAt })
    .onConflictDoNothing()
    .returning({ id: integrationSignatureNonces.id });

  return Boolean(inserted);
}

function isValidEventId(eventId: unknown): eventId is number {
  return typeof eventId === 'number' && Number.isSafeInteger(eventId) && eventId > 0;
}

export async function handleWebhookEvent(
  event: AssinafyWebhookEvent,
): Promise<AssinafyWebhookResult> {
  const eventName = event.event;
  const eventId: unknown = event.id;
  if (!isValidEventId(eventId)) {
    logger.warn('Invalid webhook event ID', { event: eventName });
    return { status: 'invalid' };
  }
  const documentId = event.object.id;

  try {
    const { result, auditArgs } = await db.transaction(async (tx) => {
      const claimed = await claimWebhookEvent(eventId, tx);
      if (!claimed) {
        return { result: { status: 'duplicate' } as const, auditArgs: null };
      }

      const mappedStatus = EVENT_STATUS_MAP[eventName];
      if (!mappedStatus) {
        return { result: { status: 'ignored' } as const, auditArgs: null };
      }

      const oficio = await findOfficialLetterByAssinafyDocumentIdForUpdate(documentId, tx);
      if (!oficio) {
        // Assinafy callbacks only reference documents previously persisted by
        // this application, so an absent Ofício is definitive for this event.
        return { result: { status: 'ignored' } as const, auditArgs: null };
      }

      const previousStatus = oficio.assinafyStatus;

      if (previousStatus === mappedStatus) {
        return { result: { status: 'ignored' } as const, auditArgs: null };
      }

      const additionalFields: AssinafyStatusPatch = {};

      if (eventName === 'signer_signed_document' || eventName === 'document_ready') {
        additionalFields.assinafySignedAt = new Date();
      }

      if (eventName === 'signer_rejected_document') {
        additionalFields.assinafyError = String(
          event.payload.decline_reason ?? 'Rejeitado pelo signatário',
        );
      }

      if (eventName === 'document_processing_failed') {
        additionalFields.assinafyError = String(
          event.payload.error_message ?? 'Erro no processamento',
        );
      }

      if (eventName === 'user_rejected_document') {
        additionalFields.assinafyError = 'Cancelado pelo usuário';
      }

      const updated = await updateAssinafyStatus(oficio.id, mappedStatus, additionalFields, tx);
      if (!updated) {
        throw new Error('Assinafy status update did not return an Ofício.');
      }

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
        const notifications = activeAdmins.map((admin) => ({
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
        result: {
          status: 'processed',
          entityId: oficio.id,
          action: 'official_letter_status_changed',
          actorId: null,
          changedFields: ['assinafyStatus', ...Object.keys(additionalFields)],
        } as const,
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

    if (result.status === 'processed') {
      logger.info('Assinafy status updated', {
        event: eventName,
        entityId: result.entityId,
        changedFields: result.changedFields,
      });
    }

    // Audit is best-effort and runs AFTER the transaction commits. A failed audit
    // INSERT must not abort the mutation's tx (passing tx as the audit executor poisons
    // the PG tx on failure). Default `db` isolates the audit to its own connection.
    if (result.status === 'processed' && auditArgs) {
      try {
        await logAuditAction(auditArgs);
      } catch {
        logger.error('Audit log failed (non-critical)', { entityId: auditArgs.entityId });
      }
    }

    return result;
  } catch {
    logger.error('Failed to process Assinafy webhook', { event: eventName });
    return { status: 'failed' };
  }
}

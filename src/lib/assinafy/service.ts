import { createLogger } from '@/lib/logger';
import type { AssinafyWebhookEvent } from './types';
import { findOficioByAssinafyDocumentId, updateAssinafyStatus } from './repository';

const logger = createLogger('assinafy:service');

const EVENT_STATUS_MAP: Record<string, string> = {
  signer_signed_document: 'partially_signed',
  document_ready: 'certificated',
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
    const result = await updateAssinafyStatus(oficio.id, mappedStatus, additionalFields);
    logger.info('Assinafy status updated', {
      oficioId: oficio.id,
      documentId,
      eventName,
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

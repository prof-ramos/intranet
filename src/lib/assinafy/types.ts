import type { oficios } from '@/lib/db/schema/oficios';

export enum AssinafyDocumentStatus {
  UPLOADING = 'uploading',
  UPLOADED = 'uploaded',
  METADATA_PROCESSING = 'metadata_processing',
  METADATA_READY = 'metadata_ready',
  PENDING_SIGNATURE = 'pending_signature',
  PARTIALLY_SIGNED = 'partially_signed',
  CERTIFICATING = 'certificating',
  CERTIFICATED = 'certificated',
  EXPIRED = 'expired',
  REJECTED_BY_SIGNER = 'rejected_by_signer',
  REJECTED_BY_USER = 'rejected_by_user',
  FAILED = 'failed',
}

export type AssinafyDocumentStatusValue = NonNullable<typeof oficios.$inferSelect.assinafyStatus>;

/**
 * Keys read by `handleWebhookEvent` from Assinafy's event-specific payload.
 * The outer webhook envelope is still open: Assinafy varies payload shape by
 * event type and vendor version (plan 019 STOP — intentional open boundary).
 */
export interface AssinafyWebhookPayloadKnown {
  decline_reason?: string;
  error_message?: string;
}

export interface AssinafyWebhookEvent {
  id: number;
  event: string;
  message: string | null;
  /**
   * Intentionally open at the HTTP boundary (plan 019 STOP).
   * Known fields used internally are documented on `AssinafyWebhookPayloadKnown`.
   * Do not replace with a strict Zod schema without vendor contract coverage.
   */
  payload: AssinafyWebhookPayloadKnown & Record<string, unknown>;
  origin: {
    ip: string;
    'user-agent': string;
  };
  created_at: number;
  subject: {
    id: string;
    full_name: string;
    email: string;
    type: string;
  };
  object: {
    id: string;
    status: string;
    type: string;
  };
  account_id: string;
}

/**
 * Internal patch for ofício Assinafy columns written by the webhook handler.
 * Prefer this over open bags when updating status-adjacent fields.
 */
export type AssinafyStatusPatch = Partial<
  Pick<typeof oficios.$inferInsert, 'assinafySignedAt' | 'assinafyError'>
>;

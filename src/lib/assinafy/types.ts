export enum AssinafyDocumentStatus {
  UPLOADING = 'uploading',
  UPLOADED = 'uploaded',
  METADATA_PROCESSING = 'metadata_processing',
  METADATA_READY = 'metadata_ready',
  PENDING_SIGNATURE = 'pending_signature',
  CERTIFICATING = 'certificating',
  CERTIFICATED = 'certificated',
  EXPIRED = 'expired',
  REJECTED_BY_SIGNER = 'rejected_by_signer',
  REJECTED_BY_USER = 'rejected_by_user',
  FAILED = 'failed',
}

export interface AssinafyWebhookEvent {
  id: number;
  event: string;
  message: string | null;
  // ponytail: intentionally open — Assinafy webhook payload varies by event type
  payload: Record<string, unknown>;
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
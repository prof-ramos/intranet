import type { AssinafyDocumentStatusValue } from './types';

export type AssinafyTransition = 'advance' | 'same' | 'stale';

const ASSINAFY_STATUSES = [
  'uploading',
  'uploaded',
  'metadata_processing',
  'metadata_ready',
  'pending_signature',
  'partially_signed',
  'certificating',
  'certificated',
  'expired',
  'rejected_by_signer',
  'rejected_by_user',
  'failed',
] as const satisfies readonly AssinafyDocumentStatusValue[];

const ASSINAFY_STATUS_SET: ReadonlySet<unknown> = new Set(ASSINAFY_STATUSES);

const WEBHOOK_DESTINATIONS = [
  'partially_signed',
  'certificating',
  'certificated',
  'expired',
  'rejected_by_signer',
  'rejected_by_user',
  'failed',
] as const satisfies readonly AssinafyDocumentStatusValue[];

const ALLOWED_TRANSITIONS: Readonly<
  Record<AssinafyDocumentStatusValue, readonly AssinafyDocumentStatusValue[]>
> = {
  uploading: WEBHOOK_DESTINATIONS,
  uploaded: WEBHOOK_DESTINATIONS,
  metadata_processing: WEBHOOK_DESTINATIONS,
  metadata_ready: WEBHOOK_DESTINATIONS,
  pending_signature: WEBHOOK_DESTINATIONS,
  partially_signed: [
    'certificating',
    'certificated',
    'rejected_by_signer',
    'rejected_by_user',
    'failed',
  ],
  certificating: ['certificated', 'rejected_by_signer', 'rejected_by_user', 'failed'],
  certificated: [],
  expired: [],
  rejected_by_signer: [],
  rejected_by_user: [],
  failed: [],
};

export function classifyAssinafyTransition(current: unknown, next: unknown): AssinafyTransition {
  if (!ASSINAFY_STATUS_SET.has(next)) return 'stale';
  if (!ASSINAFY_STATUS_SET.has(current)) return 'stale';

  const knownNext = next as AssinafyDocumentStatusValue;
  if (current === next) return 'same';
  return ALLOWED_TRANSITIONS[current as AssinafyDocumentStatusValue].includes(knownNext)
    ? 'advance'
    : 'stale';
}

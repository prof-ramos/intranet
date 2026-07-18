import { describe, expect, it } from 'vitest';
import { classifyAssinafyTransition } from './transition-policy';
import type { AssinafyDocumentStatusValue } from './types';

const MAPPED_DESTINATIONS = [
  'partially_signed',
  'certificating',
  'certificated',
  'expired',
  'rejected_by_signer',
  'rejected_by_user',
  'failed',
] as const satisfies readonly AssinafyDocumentStatusValue[];

const EXPECTED_ADVANCES: Readonly<
  Record<AssinafyDocumentStatusValue, readonly AssinafyDocumentStatusValue[]>
> = {
  uploading: MAPPED_DESTINATIONS,
  uploaded: MAPPED_DESTINATIONS,
  metadata_processing: MAPPED_DESTINATIONS,
  metadata_ready: MAPPED_DESTINATIONS,
  pending_signature: MAPPED_DESTINATIONS,
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

describe('classifyAssinafyTransition', () => {
  it('advances the normal signing flow from pending signature to partially signed', () => {
    expect(classifyAssinafyTransition('pending_signature', 'partially_signed')).toBe('advance');
  });

  it('classifies every persisted origin against every mapped webhook destination', () => {
    for (const [origin, advances] of Object.entries(EXPECTED_ADVANCES) as Array<
      [AssinafyDocumentStatusValue, readonly AssinafyDocumentStatusValue[]]
    >) {
      for (const destination of MAPPED_DESTINATIONS) {
        const expected =
          origin === destination ? 'same' : advances.includes(destination) ? 'advance' : 'stale';
        expect(classifyAssinafyTransition(origin, destination), `${origin} -> ${destination}`).toBe(
          expected,
        );
      }
    }
  });

  it('fails closed when either side of the transition is unknown', () => {
    expect(classifyAssinafyTransition(null, 'provider_future_state')).toBe('stale');
    expect(classifyAssinafyTransition('provider_future_state', 'certificated')).toBe('stale');
  });

  it('fails closed when the persisted status is absent', () => {
    expect(classifyAssinafyTransition(null, 'certificated')).toBe('stale');
  });
});

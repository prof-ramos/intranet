import { describe, expect, it } from 'vitest';

import {
  assertPocNetworkEnabled,
  createStorageKey,
  parseArgs,
  resolveProviderConfig,
  validatePocBucket,
} from './storage-spike';

describe('storage spike safety guards', () => {
  it('requires an explicit network opt-in', () => {
    expect(() => assertPocNetworkEnabled({})).toThrow('STORAGE_SPIKE_ALLOW_NETWORK=true');
    expect(() => assertPocNetworkEnabled({ STORAGE_SPIKE_ALLOW_NETWORK: 'true' })).not.toThrow();
  });

  it('rejects production-like bucket names', () => {
    expect(() => validatePocBucket('asof-prod')).toThrow();
    expect(() => validatePocBucket('asof-production-docs')).toThrow();
    expect(() => validatePocBucket('asof-docs-poc')).not.toThrow();
  });

  it('creates keys inside an opaque storage-spike prefix', () => {
    expect(createStorageKey('12345678abcdef00', 'fixture.txt')).toBe(
      'storage-spike/12345678abcdef00/fixture.txt',
    );
    expect(() => createStorageKey('../escape', 'fixture.txt')).toThrow();
    expect(() => createStorageKey('12345678abcdef00', '../escape')).toThrow();
  });

  it('parses provider and cleanup flags without network access', () => {
    expect(parseArgs(['--provider=garage', '--cleanup'])).toEqual({
      cleanup: true,
      provider: 'garage',
    });
    expect(parseArgs([], { STORAGE_SPIKE_PROVIDER: 'both' })).toEqual({
      cleanup: false,
      provider: 'both',
    });
  });

  it('resolves R2 endpoint without exposing credentials in output shape', () => {
    const config = resolveProviderConfig('r2', {
      R2_POC_ACCESS_KEY_ID: 'access',
      R2_POC_ACCOUNT_ID: 'account',
      R2_POC_BUCKET: 'asof-docs-poc',
      R2_POC_SECRET_ACCESS_KEY: 'secret',
    });
    expect(config.endpoint).toBe('https://account.r2.cloudflarestorage.com');
    expect(config.forcePathStyle).toBe(false);
    expect(config.bucket).toBe('asof-docs-poc');
  });
});

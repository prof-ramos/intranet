import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  decryptWebhookSecret,
  encryptWebhookSecret,
  isV1WebhookSecret,
} from '@/lib/integrations/webhooks/secrets';
import { encrypt as encryptV1 } from '@/lib/crypto';

const mockEnv = vi.hoisted(() => ({
  ENCRYPTION_MASTER_KEY: undefined as string | undefined,
  ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY: undefined as string | undefined,
}));

vi.mock('@/lib/env', () => ({
  env: mockEnv,
}));

const MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const LEGACY_KEY = '0123456789abcdef0123456789abcdef';

afterEach(() => {
  mockEnv.ENCRYPTION_MASTER_KEY = undefined;
  mockEnv.ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY = undefined;
});

describe('webhook secret encryption', () => {
  it('round-trips encrypted webhook secrets using V2 (HKDF)', () => {
    mockEnv.ENCRYPTION_MASTER_KEY = MASTER_KEY;

    const ciphertext = encryptWebhookSecret('super-secret');

    expect(ciphertext).toMatch(/^enc:v2:/);
    expect(decryptWebhookSecret(ciphertext)).toBe('super-secret');
  });

  it('uses a fresh nonce for each encryption', () => {
    mockEnv.ENCRYPTION_MASTER_KEY = MASTER_KEY;

    const ciphertextA = encryptWebhookSecret('super-secret');
    const ciphertextB = encryptWebhookSecret('super-secret');

    expect(ciphertextA).not.toBe(ciphertextB);
    expect(decryptWebhookSecret(ciphertextA)).toBe('super-secret');
    expect(decryptWebhookSecret(ciphertextB)).toBe('super-secret');
  });

  it('throws when encrypting without ENCRYPTION_MASTER_KEY', () => {
    expect(() => encryptWebhookSecret('super-secret')).toThrow(
      'ENCRYPTION_MASTER_KEY is required to encrypt webhook secrets.',
    );
  });

  it('throws when decrypting V2 secrets without ENCRYPTION_MASTER_KEY', () => {
    mockEnv.ENCRYPTION_MASTER_KEY = MASTER_KEY;
    const ciphertext = encryptWebhookSecret('super-secret');

    mockEnv.ENCRYPTION_MASTER_KEY = undefined;

    expect(() => decryptWebhookSecret(ciphertext)).toThrow(
      'ENCRYPTION_MASTER_KEY is required to decrypt webhook secrets.',
    );
  });

  it('decrypts V1 secrets with legacy key for migration compatibility', () => {
    mockEnv.ENCRYPTION_MASTER_KEY = MASTER_KEY;
    mockEnv.ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY = LEGACY_KEY;

    const v1Ciphertext = encryptV1('legacy-secret', LEGACY_KEY);

    expect(v1Ciphertext).toMatch(/^enc:v1:/);
    expect(decryptWebhookSecret(v1Ciphertext)).toBe('legacy-secret');
  });

  it('detects V1 secrets for migration', () => {
    mockEnv.ENCRYPTION_MASTER_KEY = MASTER_KEY;
    mockEnv.ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY = LEGACY_KEY;

    const v1Ciphertext = encryptV1('legacy-secret', LEGACY_KEY);
    expect(isV1WebhookSecret(v1Ciphertext)).toBe(true);

    mockEnv.ENCRYPTION_MASTER_KEY = MASTER_KEY;
    const v2Ciphertext = encryptWebhookSecret('new-secret');
    expect(isV1WebhookSecret(v2Ciphertext)).toBe(false);
  });

  // F-002 fix: plaintext secrets are no longer accepted.
  it('rejects plaintext secrets without an encryption prefix', () => {
    expect(() => decryptWebhookSecret('legacy-plaintext-secret')).toThrow(
      'Webhook secret is not encrypted',
    );
  });
});

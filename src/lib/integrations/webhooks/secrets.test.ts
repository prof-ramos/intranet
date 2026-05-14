import { afterEach, describe, expect, it, vi } from 'vitest';
import { decryptWebhookSecret, encryptWebhookSecret } from '@/lib/integrations/webhooks/secrets';

const mockEnv = vi.hoisted(() => ({
  ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY: undefined as string | undefined,
}));

vi.mock('@/lib/env', () => ({
  env: mockEnv,
}));

const TEST_KEY = '0123456789abcdef0123456789abcdef';

afterEach(() => {
  mockEnv.ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY = undefined;
});

describe('webhook secret encryption', () => {
  it('round-trips encrypted webhook secrets', () => {
    mockEnv.ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY = TEST_KEY;

    const ciphertext = encryptWebhookSecret('super-secret');

    expect(ciphertext).toMatch(/^enc:v1:/);
    expect(decryptWebhookSecret(ciphertext)).toBe('super-secret');
  });

  it('uses a fresh nonce for each encryption', () => {
    mockEnv.ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY = TEST_KEY;

    const ciphertextA = encryptWebhookSecret('super-secret');
    const ciphertextB = encryptWebhookSecret('super-secret');

    expect(ciphertextA).not.toBe(ciphertextB);
    expect(decryptWebhookSecret(ciphertextA)).toBe('super-secret');
    expect(decryptWebhookSecret(ciphertextB)).toBe('super-secret');
  });

  it('throws when encrypting without an encryption key', () => {
    expect(() => encryptWebhookSecret('super-secret')).toThrow(
      'ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY is required to encrypt webhook secrets.',
    );
  });

  it('throws when decrypting encrypted secrets without an encryption key', () => {
    mockEnv.ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY = TEST_KEY;
    const ciphertext = encryptWebhookSecret('super-secret');

    mockEnv.ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY = undefined;

    expect(() => decryptWebhookSecret(ciphertext)).toThrow(
      'ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY is required to decrypt webhook secrets.',
    );
  });

  it('accepts legacy plaintext secrets during the transition', () => {
    expect(decryptWebhookSecret('legacy-plaintext-secret')).toBe('legacy-plaintext-secret');
  });
});

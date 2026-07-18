import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateIntegrationSigningSecret,
  encryptIntegrationSigningSecret,
  decryptIntegrationSigningSecret,
} from './signing-secrets';

describe('signing-secrets', () => {
  const mockMasterKey = 'mock-encryption-master-key-32-chars-long';

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('generateIntegrationSigningSecret', () => {
    it('generates distinct 43-character base64url strings', () => {
      const firstSecret = generateIntegrationSigningSecret();
      const secondSecret = generateIntegrationSigningSecret();

      expect(firstSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(secondSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(secondSecret).not.toBe(firstSecret);
    });
  });

  describe('encryptIntegrationSigningSecret and decryptIntegrationSigningSecret', () => {
    it('encrypts and decrypts correctly when ENCRYPTION_MASTER_KEY is set', () => {
      vi.stubEnv('ENCRYPTION_MASTER_KEY', mockMasterKey);

      const plaintext = 'my-super-secret-signing-key';

      const ciphertext = encryptIntegrationSigningSecret(plaintext);
      expect(ciphertext).not.toBe(plaintext);
      expect(ciphertext).toMatch(/^enc:v2:/);

      const decrypted = decryptIntegrationSigningSecret(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it.each(['', '   '])(
      'throws an error if ENCRYPTION_MASTER_KEY is missing for encryption (%j)',
      (masterKey) => {
        vi.stubEnv('ENCRYPTION_MASTER_KEY', masterKey);

        expect(() => encryptIntegrationSigningSecret('test')).toThrow(
          'ENCRYPTION_MASTER_KEY is required to encrypt integration signing secrets.',
        );
      },
    );

    it.each(['', '   '])(
      'throws an error if ENCRYPTION_MASTER_KEY is missing for decryption (%j)',
      (masterKey) => {
        vi.stubEnv('ENCRYPTION_MASTER_KEY', masterKey);

        expect(() => decryptIntegrationSigningSecret('enc:v2:test')).toThrow(
          'ENCRYPTION_MASTER_KEY is required to decrypt integration signing secrets.',
        );
      },
    );
  });
});

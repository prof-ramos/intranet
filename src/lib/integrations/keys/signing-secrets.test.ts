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
    it('generates a random string', () => {
      const secret = generateIntegrationSigningSecret();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(0);

      const secret2 = generateIntegrationSigningSecret();
      expect(secret).not.toBe(secret2);
    });
  });

  describe('encryptIntegrationSigningSecret and decryptIntegrationSigningSecret', () => {
    it('encrypts and decrypts correctly when ENCRYPTION_MASTER_KEY is set', () => {
      vi.stubEnv('ENCRYPTION_MASTER_KEY', mockMasterKey);

      const plaintext = 'my-super-secret-signing-key';

      const ciphertext = encryptIntegrationSigningSecret(plaintext);
      expect(ciphertext).not.toBe(plaintext);
      expect(ciphertext).toContain('enc:v2:');

      const decrypted = decryptIntegrationSigningSecret(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it('throws an error if ENCRYPTION_MASTER_KEY is not set for encryption', () => {
      vi.stubEnv('ENCRYPTION_MASTER_KEY', '');

      expect(() => encryptIntegrationSigningSecret('test')).toThrow(
        'ENCRYPTION_MASTER_KEY is required to encrypt integration signing secrets.'
      );
    });

    it('throws an error if ENCRYPTION_MASTER_KEY is not set for decryption', () => {
      vi.stubEnv('ENCRYPTION_MASTER_KEY', '');

      expect(() => decryptIntegrationSigningSecret('enc:v2:test')).toThrow(
        'ENCRYPTION_MASTER_KEY is required to decrypt integration signing secrets.'
      );
    });
  });
});

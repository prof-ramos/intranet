import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  generateIntegrationSigningSecret,
  encryptIntegrationSigningSecret,
  decryptIntegrationSigningSecret,
} from './signing-secrets';

describe('signing-secrets', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('generateIntegrationSigningSecret', () => {
    it('generates a 43-character base64url string', () => {
      const secret = generateIntegrationSigningSecret();
      // 32 bytes encoded in base64url is 43 characters
      expect(secret.length).toBe(43);
      expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('encryption and decryption', () => {
    const originalEnv = process.env.ENCRYPTION_MASTER_KEY;

    it('encrypts and decrypts a secret correctly', () => {
      // Use a fixed master key for the test
      vi.stubEnv('ENCRYPTION_MASTER_KEY', 'test-master-key-32-chars-long-1234');
      const secret = 'my-super-secret-integration-key';
      const encrypted = encryptIntegrationSigningSecret(secret);
      expect(encrypted).not.toBe(secret);
      expect(encrypted.startsWith('enc:v2:')).toBe(true);
      const decrypted = decryptIntegrationSigningSecret(encrypted);
      expect(decrypted).toBe(secret);
    });
  });

  describe('getMasterKey error handling', () => {
    it('throws an error when ENCRYPTION_MASTER_KEY is not set during encryption', () => {
      vi.stubEnv('ENCRYPTION_MASTER_KEY', '');
      expect(() => encryptIntegrationSigningSecret('test-secret')).toThrow(
        'ENCRYPTION_MASTER_KEY is required to encrypt integration signing secrets.'
      );
    });

    it('throws an error when ENCRYPTION_MASTER_KEY is not set during decryption', () => {
      vi.stubEnv('ENCRYPTION_MASTER_KEY', '');
      expect(() => decryptIntegrationSigningSecret('test-ciphertext')).toThrow(
        'ENCRYPTION_MASTER_KEY is required to decrypt integration signing secrets.'
      );
    });
  });
});

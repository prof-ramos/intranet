import { describe, expect, it, vi, beforeEach } from 'vitest';
import { encryptPii, decryptPii, piiBlindIndex, decryptPiiField } from '@/lib/crypto/pii';
import { encryptV2, decryptV2, KEY_CONTEXTS, hkdfDeriveKey, blindIndex } from '@/lib/crypto';

vi.mock('@/lib/env', () => ({
  env: {
    ENCRYPTION_MASTER_KEY: 'master-key-for-testing-32bytes!',
    ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY: undefined,
  },
}));

describe('PII encryption module', () => {
  const masterKey = 'master-key-for-testing-32bytes!';

  describe('encryptPii / decryptPii', () => {
    it('round-trips PII encryption', () => {
      const ciphertext = encryptPii('123.456.789-00');
      expect(ciphertext).toMatch(/^enc:v2:k1\./);
      expect(decryptPii(ciphertext)).toBe('123.456.789-00');
    });

    it('uses pii-encryption context', () => {
      const plaintext = '1234567890';
      const ciphertext = encryptPii(plaintext);
      const v2Direct = encryptV2(plaintext, masterKey, KEY_CONTEXTS.piiEncryption);
      expect(ciphertext).toMatch(/^enc:v2:/);
      // Different nonces produce different ciphertext, so we verify by decryption
      expect(decryptPii(ciphertext)).toBe(plaintext);
      expect(decryptV2(v2Direct, masterKey, KEY_CONTEXTS.piiEncryption)).toBe(plaintext);
    });

    it('fails to decrypt with wrong context', () => {
      const ciphertext = encryptPii('secret-siape');
      expect(() => decryptV2(ciphertext, masterKey, KEY_CONTEXTS.webhookSecrets)).toThrow();
    });
  });

  describe('piiBlindIndex', () => {
    it('produces a deterministic hex string', () => {
      const hash = piiBlindIndex('123.456.789-00');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('normalizes input (trim + lowercase)', () => {
      const searchKey = hkdfDeriveKey(masterKey, KEY_CONTEXTS.piiSearch).toString('hex');
      expect(piiBlindIndex('  TEST@EXAMPLE.COM  ')).toBe(
        blindIndex('test@example.com', searchKey),
      );
    });

    it('produces same hash as direct blindIndex call', () => {
      const searchKey = hkdfDeriveKey(masterKey, KEY_CONTEXTS.piiSearch).toString('hex');
      expect(piiBlindIndex('123456')).toBe(blindIndex('123456', searchKey));
    });
  });

  describe('decryptPiiField', () => {
    it('decrypts ciphertext when present', () => {
      const ciphertext = encryptPii('sensitive-value');
      expect(decryptPiiField(ciphertext, 'fallback')).toBe('sensitive-value');
    });

    it('falls back to plaintext when ciphertext is null', () => {
      expect(decryptPiiField(null, 'plain-value')).toBe('plain-value');
    });

    it('returns null when both are null', () => {
      expect(decryptPiiField(null, null)).toBeNull();
    });

    it('returns null plaintext when ciphertext is null and plaintext is null', () => {
      expect(decryptPiiField(null, null)).toBeNull();
    });

    it('prefers ciphertext over plaintext', () => {
      const ciphertext = encryptPii('encrypted-value');
      expect(decryptPiiField(ciphertext, 'old-plain-value')).toBe('encrypted-value');
    });
  });
});
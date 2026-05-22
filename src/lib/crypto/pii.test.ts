import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    ENCRYPTION_MASTER_KEY: 'test-master-key-32-bytes-long-xxxx',
    ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY: undefined,
  },
}));

import { encryptPii, decryptPii, piiBlindIndex, decryptPiiField } from './pii';

const PLAINTEXT_CPF = '12345678901';
const PLAINTEXT_SIAPE = '9876543';

describe('PII crypto module', () => {
  describe('encryptPii / decryptPii', () => {
    it('round-trips a CPF', () => {
      const ciphertext = encryptPii(PLAINTEXT_CPF);
      expect(ciphertext).toMatch(/^enc:v2:/);
      expect(decryptPii(ciphertext)).toBe(PLAINTEXT_CPF);
    });

    it('round-trips a SIAPE', () => {
      const ciphertext = encryptPii(PLAINTEXT_SIAPE);
      expect(decryptPii(ciphertext)).toBe(PLAINTEXT_SIAPE);
    });

    it('round-trips unicode characters', () => {
      const plaintext = 'Saudações — çãéêõü — 🚀';
      const ciphertext = encryptPii(plaintext);
      expect(decryptPii(ciphertext)).toBe(plaintext);
    });

    it('produces different ciphertexts for the same plaintext (random IV)', () => {
      const a = encryptPii(PLAINTEXT_CPF);
      const b = encryptPii(PLAINTEXT_CPF);
      expect(a).not.toBe(b);
    });

    it('passes through plaintext when no prefix is present', () => {
      expect(decryptPii('plain-value')).toBe('plain-value');
    });
  });

  describe('piiBlindIndex', () => {
    it('produces a deterministic hex hash', () => {
      const idx1 = piiBlindIndex(PLAINTEXT_CPF);
      const idx2 = piiBlindIndex(PLAINTEXT_CPF);
      expect(idx1).toBe(idx2);
      expect(idx1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('normalizes whitespace and case before hashing', () => {
      expect(piiBlindIndex('  12345678901  ')).toBe(piiBlindIndex('12345678901'));
    });

    it('produces different indices for different values', () => {
      expect(piiBlindIndex('12345678901')).not.toBe(piiBlindIndex('98765432101'));
    });
  });

  describe('decryptPiiField', () => {
    it('decrypts ciphertext when present', () => {
      const ciphertext = encryptPii(PLAINTEXT_CPF);
      expect(decryptPiiField(ciphertext, null)).toBe(PLAINTEXT_CPF);
      expect(decryptPiiField(ciphertext, 'fallback')).toBe(PLAINTEXT_CPF);
    });

    it('falls back to plaintext column when ciphertext is null', () => {
      expect(decryptPiiField(null, 'plain-cpf')).toBe('plain-cpf');
    });

    it('returns null when both are null', () => {
      expect(decryptPiiField(null, null)).toBeNull();
    });

    it('falls back to plaintext when ciphertext is empty string', () => {
      expect(decryptPiiField('', 'plain-cpf')).toBe('plain-cpf');
    });
  });
});

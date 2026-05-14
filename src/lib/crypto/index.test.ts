import { describe, expect, it } from 'vitest';
import { decrypt, encrypt, PREFIX } from '@/lib/crypto';

const TEST_KEY = '0123456789abcdef0123456789abcdef';
const OTHER_KEY = 'abcdef0123456789abcdef0123456789';

describe('crypto module', () => {
  describe('encrypt', () => {
    it('produces versioned ciphertext with the enc:v1: prefix', () => {
      const ciphertext = encrypt('hello', TEST_KEY);
      expect(ciphertext).toMatch(/^enc:v1:[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    });

    it('uses a fresh nonce for each encryption', () => {
      const ciphertextA = encrypt('same-plaintext', TEST_KEY);
      const ciphertextB = encrypt('same-plaintext', TEST_KEY);

      expect(ciphertextA).not.toBe(ciphertextB);
    });

    it('produces three dot-separated segments after the prefix', () => {
      const ciphertext = encrypt('payload', TEST_KEY);
      const body = ciphertext.slice(PREFIX.length);
      const segments = body.split('.');
      expect(segments).toHaveLength(3);
    });
  });

  describe('decrypt', () => {
    it('round-trips encrypted values', () => {
      const ciphertext = encrypt('round-trip-test', TEST_KEY);
      expect(decrypt(ciphertext, TEST_KEY)).toBe('round-trip-test');
    });

    it('round-trips unicode and special characters', () => {
      const plaintext = 'Saudações — çãéêõü — 🚀';
      const ciphertext = encrypt(plaintext, TEST_KEY);
      expect(decrypt(ciphertext, TEST_KEY)).toBe(plaintext);
    });

    it('round-trips empty strings', () => {
      const ciphertext = encrypt('', TEST_KEY);
      expect(decrypt(ciphertext, TEST_KEY)).toBe('');
    });

    it('returns legacy plaintext as-is when no prefix is present', () => {
      expect(decrypt('legacy-plaintext-secret', TEST_KEY)).toBe('legacy-plaintext-secret');
    });

    it('returns legacy plaintext as-is even without a key (prefix check happens first)', () => {
      expect(decrypt('plain-value', 'any-key')).toBe('plain-value');
    });

    it('throws on ciphertext produced with a different key', () => {
      const ciphertext = encrypt('secret-data', TEST_KEY);
      expect(() => decrypt(ciphertext, OTHER_KEY)).toThrow();
    });

    it('throws on malformed ciphertext (missing segments)', () => {
      expect(() => decrypt('enc:v1:onlyonepart', TEST_KEY)).toThrow(
        'Invalid encrypted value format.',
      );
    });

    it('throws on malformed ciphertext (two segments instead of three)', () => {
      const fake = `enc:v1:${btoa('iv')}.${btoa('tag')}`;
      expect(() => decrypt(fake, TEST_KEY)).toThrow();
    });
  });

  describe('cross-key isolation', () => {
    it('cannot decrypt with a different key', () => {
      const ciphertext = encrypt('isolated', TEST_KEY);
      expect(() => decrypt(ciphertext, OTHER_KEY)).toThrow();
    });
  });
});
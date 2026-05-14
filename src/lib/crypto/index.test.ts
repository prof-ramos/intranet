import { describe, expect, it } from 'vitest';
import {
  decrypt,
  encrypt,
  V1_PREFIX,
  hkdfDeriveKey,
  blindIndex,
  encryptV2,
  decryptV2,
  KEY_CONTEXTS,
} from '@/lib/crypto';

const TEST_KEY = '0123456789abcdef0123456789abcdef';
const OTHER_KEY = 'abcdef0123456789abcdef0123456789';
const MASTER_KEY = 'master-key-for-testing-32bytes!';

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
      const body = ciphertext.slice(V1_PREFIX.length);
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
        'Invalid v1 encrypted value format.',
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

  describe('hkdfDeriveKey', () => {
    it('produces a 32-byte Buffer', () => {
      const key = hkdfDeriveKey(MASTER_KEY, KEY_CONTEXTS.piiEncryption);
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('produces different keys for different contexts', () => {
      const piiKey = hkdfDeriveKey(MASTER_KEY, KEY_CONTEXTS.piiEncryption);
      const searchKey = hkdfDeriveKey(MASTER_KEY, KEY_CONTEXTS.piiSearch);
      const webhookKey = hkdfDeriveKey(MASTER_KEY, KEY_CONTEXTS.webhookSecrets);

      expect(piiKey.equals(searchKey)).toBe(false);
      expect(piiKey.equals(webhookKey)).toBe(false);
      expect(searchKey.equals(webhookKey)).toBe(false);
    });

    it('produces the same key for the same context and master key', () => {
      const key1 = hkdfDeriveKey(MASTER_KEY, KEY_CONTEXTS.piiEncryption);
      const key2 = hkdfDeriveKey(MASTER_KEY, KEY_CONTEXTS.piiEncryption);
      expect(key1.equals(key2)).toBe(true);
    });

    it('produces different keys for different master keys', () => {
      const key1 = hkdfDeriveKey(MASTER_KEY, KEY_CONTEXTS.piiEncryption);
      const key2 = hkdfDeriveKey(OTHER_KEY, KEY_CONTEXTS.piiEncryption);
      expect(key1.equals(key2)).toBe(false);
    });
  });

  describe('blindIndex', () => {
    it('produces a deterministic hex string', () => {
      const searchKey = hkdfDeriveKey(MASTER_KEY, KEY_CONTEXTS.piiSearch).toString('hex');
      const hash = blindIndex('test@example.com', searchKey);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces the same hash for the same input and key', () => {
      const searchKey = hkdfDeriveKey(MASTER_KEY, KEY_CONTEXTS.piiSearch).toString('hex');
      expect(blindIndex('test@example.com', searchKey)).toBe(
        blindIndex('test@example.com', searchKey),
      );
    });

    it('produces different hashes for different inputs', () => {
      const searchKey = hkdfDeriveKey(MASTER_KEY, KEY_CONTEXTS.piiSearch).toString('hex');
      expect(blindIndex('user1@example.com', searchKey)).not.toBe(
        blindIndex('user2@example.com', searchKey),
      );
    });

    it('produces different hashes for different keys', () => {
      const searchKey1 = hkdfDeriveKey(MASTER_KEY, KEY_CONTEXTS.piiSearch).toString('hex');
      const searchKey2 = hkdfDeriveKey(OTHER_KEY, KEY_CONTEXTS.piiSearch).toString('hex');
      expect(blindIndex('test@example.com', searchKey1)).not.toBe(
        blindIndex('test@example.com', searchKey2),
      );
    });
  });

  describe('v2 encryption', () => {
    it('encrypts with v2 format', () => {
      const ciphertext = encryptV2('hello', MASTER_KEY, KEY_CONTEXTS.piiEncryption);
      expect(ciphertext).toMatch(/^enc:v2:k1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    });

    it('round-trips with decryptV2', () => {
      const plaintext = 'round-trip-v2-test';
      const ciphertext = encryptV2(plaintext, MASTER_KEY, KEY_CONTEXTS.piiEncryption);
      expect(decryptV2(ciphertext, MASTER_KEY, KEY_CONTEXTS.piiEncryption)).toBe(plaintext);
    });

    it('uses different keys for different contexts', () => {
      const piiCiphertext = encryptV2('test', MASTER_KEY, KEY_CONTEXTS.piiEncryption);
      expect(() => decryptV2(piiCiphertext, MASTER_KEY, KEY_CONTEXTS.webhookSecrets)).toThrow();
    });

    it('supports custom key IDs', () => {
      const ciphertext = encryptV2('test', MASTER_KEY, KEY_CONTEXTS.piiEncryption, 'k2');
      expect(ciphertext).toMatch(/^enc:v2:k2\./);
    });

    it('returns plaintext for non-v2 input', () => {
      expect(decryptV2('plain-value', MASTER_KEY, KEY_CONTEXTS.piiEncryption)).toBe('plain-value');
    });

    it('throws for v1 input', () => {
      const v1 = encrypt('test', TEST_KEY);
      expect(() => decryptV2(v1, MASTER_KEY, KEY_CONTEXTS.piiEncryption)).toThrow(
        'v1 ciphertext passed to decryptV2',
      );
    });
  });
});

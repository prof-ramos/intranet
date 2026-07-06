import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  decrypt,
  encrypt,
  V1_PREFIX,
  V2_PREFIX,
  hkdfDeriveKey,
  blindIndex,
  encryptV2,
  decryptV2,
  KEY_CONTEXTS,
} from '@/lib/crypto';

const TEST_KEY = '0123456789abcdef0123456789abcdef';
const OTHER_KEY = 'abcdef0123456789abcdef0123456789';

describe('crypto module', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('V1 encrypt', () => {
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

  describe('V1 decrypt', () => {
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

    it('returns legacy plaintext as-is even without a key', () => {
      expect(decrypt('plain-value', 'any-key')).toBe('plain-value');
    });

    it('warns once outside tests when legacy plaintext is passed through', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.resetModules();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { decrypt: decryptFresh } = await import('@/lib/crypto');

      expect(decryptFresh('legacy-a', TEST_KEY)).toBe('legacy-a');
      expect(decryptFresh('legacy-b', TEST_KEY)).toBe('legacy-b');

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        '[crypto] decrypt called on non-encrypted value — legacy plaintext passthrough',
      );
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

  describe('V1 cross-key isolation', () => {
    it('cannot decrypt with a different key', () => {
      const ciphertext = encrypt('isolated', TEST_KEY);
      expect(() => decrypt(ciphertext, OTHER_KEY)).toThrow();
    });
  });

  describe('hkdfDeriveKey', () => {
    it('produces a 32-byte buffer', () => {
      const key = hkdfDeriveKey(TEST_KEY, KEY_CONTEXTS.piiEncryption);
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('produces different keys for different contexts', () => {
      const encKey = hkdfDeriveKey(TEST_KEY, KEY_CONTEXTS.piiEncryption);
      const searchKey = hkdfDeriveKey(TEST_KEY, KEY_CONTEXTS.piiSearch);
      expect(encKey.equals(searchKey)).toBe(false);
    });

    it('produces the same key for the same context and master key', () => {
      const key1 = hkdfDeriveKey(TEST_KEY, KEY_CONTEXTS.piiEncryption);
      const key2 = hkdfDeriveKey(TEST_KEY, KEY_CONTEXTS.piiEncryption);
      expect(key1.equals(key2)).toBe(true);
    });

    it('produces different keys for different master keys', () => {
      const key1 = hkdfDeriveKey(TEST_KEY, KEY_CONTEXTS.piiEncryption);
      const key2 = hkdfDeriveKey(OTHER_KEY, KEY_CONTEXTS.piiEncryption);
      expect(key1.equals(key2)).toBe(false);
    });
  });

  describe('blindIndex', () => {
    it('produces a hex string', () => {
      const idx = blindIndex('12345678901', 'searchkey-searchkey-searchkey-se');
      expect(idx).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces the same index for the same input', () => {
      const idx1 = blindIndex('12345678901', 'searchkey-searchkey-searchkey-se');
      const idx2 = blindIndex('12345678901', 'searchkey-searchkey-searchkey-se');
      expect(idx1).toBe(idx2);
    });

    it('produces different indices for different inputs', () => {
      const idx1 = blindIndex('12345678901', 'searchkey-searchkey-searchkey-se');
      const idx2 = blindIndex('98765432101', 'searchkey-searchkey-searchkey-se');
      expect(idx1).not.toBe(idx2);
    });

    it('produces different indices for different search keys', () => {
      const idx1 = blindIndex('12345678901', 'searchkey-searchkey-searchkey-se');
      const idx2 = blindIndex('12345678901', 'other-search-key-other-search-ke');
      expect(idx1).not.toBe(idx2);
    });
  });

  describe('V2 encryptV2/decryptV2', () => {
    it('produces versioned ciphertext with the enc:v2: prefix', () => {
      const ciphertext = encryptV2('hello', TEST_KEY, KEY_CONTEXTS.piiEncryption);
      expect(ciphertext).toMatch(
        /^enc:v2:[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
      );
    });

    it('produces four dot-separated segments after the prefix', () => {
      const ciphertext = encryptV2('payload', TEST_KEY, KEY_CONTEXTS.piiEncryption);
      const body = ciphertext.slice(V2_PREFIX.length);
      const segments = body.split('.');
      expect(segments).toHaveLength(4);
    });

    it('uses a fresh nonce for each encryption', () => {
      const a = encryptV2('same', TEST_KEY, KEY_CONTEXTS.piiEncryption);
      const b = encryptV2('same', TEST_KEY, KEY_CONTEXTS.piiEncryption);
      expect(a).not.toBe(b);
    });

    it('round-trips encrypted values', () => {
      const ciphertext = encryptV2('round-trip-v2', TEST_KEY, KEY_CONTEXTS.piiEncryption);
      expect(decryptV2(ciphertext, TEST_KEY, KEY_CONTEXTS.piiEncryption)).toBe('round-trip-v2');
    });

    it('round-trips unicode and special characters', () => {
      const plaintext = 'Saudações — çãéêõü — 🚀';
      const ciphertext = encryptV2(plaintext, TEST_KEY, KEY_CONTEXTS.piiEncryption);
      expect(decryptV2(ciphertext, TEST_KEY, KEY_CONTEXTS.piiEncryption)).toBe(plaintext);
    });

    it('round-trips empty strings', () => {
      const ciphertext = encryptV2('', TEST_KEY, KEY_CONTEXTS.piiEncryption);
      expect(decryptV2(ciphertext, TEST_KEY, KEY_CONTEXTS.piiEncryption)).toBe('');
    });

    it('returns plaintext as-is when no prefix is present', () => {
      expect(decryptV2('plain-value', TEST_KEY, KEY_CONTEXTS.piiEncryption)).toBe('plain-value');
    });

    it('throws when a v1 ciphertext is passed to decryptV2', () => {
      const v1 = encrypt('v1-data', TEST_KEY);
      expect(() => decryptV2(v1, TEST_KEY, KEY_CONTEXTS.piiEncryption)).toThrow(
        'v1 ciphertext passed to decryptV2',
      );
    });

    it('throws on malformed v2 ciphertext', () => {
      expect(() => decryptV2('enc:v2:bad', TEST_KEY, KEY_CONTEXTS.piiEncryption)).toThrow(
        'Invalid v2 encrypted value format.',
      );
    });

    it('throws on v2 ciphertext with wrong master key', () => {
      const ciphertext = encryptV2('secret', TEST_KEY, KEY_CONTEXTS.piiEncryption);
      expect(() => decryptV2(ciphertext, OTHER_KEY, KEY_CONTEXTS.piiEncryption)).toThrow();
    });
  });

  describe('V2 cross-key and cross-context isolation', () => {
    it('cannot decrypt with a different master key', () => {
      const ciphertext = encryptV2('isolated', TEST_KEY, KEY_CONTEXTS.piiEncryption);
      expect(() => decryptV2(ciphertext, OTHER_KEY, KEY_CONTEXTS.piiEncryption)).toThrow();
    });

    it('cannot decrypt with a different context than was used to encrypt', () => {
      const ciphertext = encryptV2('cross-context', TEST_KEY, KEY_CONTEXTS.piiEncryption);
      expect(() => decryptV2(ciphertext, TEST_KEY, KEY_CONTEXTS.piiSearch)).toThrow();
    });
  });
});

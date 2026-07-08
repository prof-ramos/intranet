import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  createHash,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

// ─── V1 Encryption (legacy, used by webhook secrets) ─────────────────────────

const V1_PREFIX = 'enc:v1:';
const V2_PREFIX = 'enc:v2:';
const IV_LENGTH_BYTES = 12;

/** @deprecated Use hkdfDeriveKey for new code. */
function deriveKeyLegacy(key: string): Buffer {
  return createHash('sha256').update(key).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM with legacy SHA-256 key
 * derivation. The output format is `enc:v1:{iv}.{authTag}.{ciphertext}`.
 *
 * A fresh 12-byte IV is generated for every call, so encrypting the same
 * plaintext twice always produces different ciphertext.
 */
export function encrypt(plaintext: string, key: string): string {
  const derivedKey = deriveKeyLegacy(key);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${V1_PREFIX}${iv.toString('base64url')}.${authTag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

/** Module-level flag to warn once per process about legacy plaintext. */
let warnedLegacyPlaintext = false;

/**
 * Decrypts a v1 ciphertext. If the input does not start with the `enc:v1:`
 * prefix it is returned as-is (legacy plaintext passthrough).
 *
 * @throws Error if the ciphertext format is invalid or decryption fails.
 */
export function decrypt(ciphertext: string, key: string): string {
  if (!ciphertext.startsWith(V1_PREFIX)) {
    if (!warnedLegacyPlaintext && process.env.NODE_ENV !== 'test') {
      warnedLegacyPlaintext = true;
      console.warn('[crypto] decrypt called on non-encrypted value — legacy plaintext passthrough');
    }
    return ciphertext;
  }

  const derivedKey = deriveKeyLegacy(key);
  const encoded = ciphertext.slice(V1_PREFIX.length);
  const parts = encoded.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid v1 encrypted value format.');
  }
  const [ivEncoded, authTagEncoded, ciphertextEncoded] = parts;
  if (!ivEncoded || !authTagEncoded || ciphertextEncoded === undefined) {
    throw new Error('Invalid v1 encrypted value format.');
  }

  const decipher = createDecipheriv('aes-256-gcm', derivedKey, Buffer.from(ivEncoded, 'base64url'));
  decipher.setAuthTag(Buffer.from(authTagEncoded, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

// ─── HKDF Key Derivation (domain-separated) ─────────────────────────────────

const HKDF_SALT = 'asof-intranet-v1';
const HKDF_KEY_LENGTH = 32;

/** Domain-separated contexts for HKDF key derivation. */
export const KEY_CONTEXTS = {
  piiEncryption: 'pii-encryption',
  piiSearch: 'pii-search',
  webhookSecrets: 'webhook-secrets',
  appSettings: 'app-settings',
  integrationSigningSecrets: 'integration-signing-secrets',
} as const;

export type KeyContext = (typeof KEY_CONTEXTS)[keyof typeof KEY_CONTEXTS];

/**
 * Derives a 32-byte key from a master key using HKDF-SHA256 with domain
 * separation. Different contexts produce cryptographically independent keys
 * from the same master key, so compromising one context does not affect others.
 */
export function hkdfDeriveKey(masterKey: string, context: KeyContext): Buffer {
  return Buffer.from(hkdfSync('sha256', masterKey, HKDF_SALT, context, HKDF_KEY_LENGTH));
}

// ─── HMAC Blind Index (searchable encryption) ───────────────────────────────

/**
 * Computes a deterministic blind index using HMAC-SHA-256 with a dedicated
 * search key. Unlike plain SHA-256, HMAC prevents offline enumeration attacks
 * on low-entropy PII fields (CPF, SIAPE, email) because the attacker needs
 * the secret key to compute hashes for comparison.
 *
 * Use hkdfDeriveKey(masterKey, 'pii-search') to produce the searchKey.
 */
export function blindIndex(plaintext: string, searchKey: string): string {
  return createHmac('sha256', searchKey).update(plaintext).digest('hex');
}

// ─── V2 Encryption (HKDF, domain-separated, key rotation) ──────────────────

/**
 * Encrypts a plaintext string using AES-256-GCM with HKDF-derived keys.
 * The output format is `enc:v2:{keyId}.{iv}.{authTag}.{ciphertext}`.
 *
 * The keyId supports zero-downtime key rotation: during rotation, decrypt
 * with old keys and encrypt with the new active key.
 */
export function encryptV2(
  plaintext: string,
  masterKey: string,
  context: KeyContext,
  keyId = 'k1',
): string {
  const derivedKey = hkdfDeriveKey(masterKey, context);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${V2_PREFIX}${keyId}.${iv.toString('base64url')}.${authTag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

/**
 * Decrypts a v2 ciphertext using a specific key context.
 * For v1 ciphertexts or plaintext passthrough, use the v1 `decrypt` function.
 *
 * @throws Error if the ciphertext format is invalid or decryption fails.
 */
export function decryptV2(ciphertext: string, masterKey: string, context: KeyContext): string {
  if (!ciphertext.startsWith(V2_PREFIX)) {
    if (ciphertext.startsWith(V1_PREFIX)) {
      throw new Error('v1 ciphertext passed to decryptV2; use decrypt() for v1.');
    }
    return ciphertext;
  }

  const encoded = ciphertext.slice(V2_PREFIX.length);
  const parts = encoded.split('.');
  if (parts.length !== 4) {
    throw new Error('Invalid v2 encrypted value format.');
  }
  const [keyId, ivEncoded, authTagEncoded, ciphertextEncoded] = parts;
  if (!keyId || !ivEncoded || !authTagEncoded || ciphertextEncoded === undefined) {
    throw new Error('Invalid v2 encrypted value format.');
  }

  const derivedKey = hkdfDeriveKey(masterKey, context);
  const decipher = createDecipheriv('aes-256-gcm', derivedKey, Buffer.from(ivEncoded, 'base64url'));
  decipher.setAuthTag(Buffer.from(authTagEncoded, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

export { V1_PREFIX, V2_PREFIX };

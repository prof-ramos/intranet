import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1:';
const IV_LENGTH_BYTES = 12;

/**
 * Derives a 32-byte AES key from an arbitrary string using SHA-256.
 */
function deriveKey(key: string): Buffer {
  return createHash('sha256').update(key).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM with the given key.
 *
 * The key string is hashed with SHA-256 to produce the 32-byte cipher key.
 * The output format is `enc:v1:{iv}.{authTag}.{ciphertext}` (all segments
 * base64url-encoded).
 *
 * A fresh 12-byte IV is generated for every call, so encrypting the same
 * plaintext twice always produces different ciphertext.
 */
export function encrypt(plaintext: string, key: string): string {
  const derivedKey = deriveKey(key);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('base64url')}.${authTag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

/**
 * Decrypts a versioned ciphertext produced by `encrypt`.
 *
 * Supports backwards compatibility: if the input does not start with the
 * `enc:v1:` prefix it is returned as-is (legacy plaintext).
 *
 * @throws Error if the ciphertext format is invalid or decryption fails.
 */
export function decrypt(ciphertext: string, key: string): string {
  if (!ciphertext.startsWith(PREFIX)) {
    return ciphertext;
  }

  const derivedKey = deriveKey(key);
  const encoded = ciphertext.slice(PREFIX.length);
  const parts = encoded.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format.');
  }
  const [ivEncoded, authTagEncoded, ciphertextEncoded] = parts;
  if (!ivEncoded || !authTagEncoded || ciphertextEncoded === undefined) {
    throw new Error('Invalid encrypted value format.');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    derivedKey,
    Buffer.from(ivEncoded, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(authTagEncoded, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

export { PREFIX, IV_LENGTH_BYTES };
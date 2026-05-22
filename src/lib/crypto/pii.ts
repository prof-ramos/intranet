import { encryptV2, decryptV2, blindIndex, hkdfDeriveKey, KEY_CONTEXTS } from '@/lib/crypto';
import { env } from '@/lib/env';

function getMasterKey(): string {
  const key = env.ENCRYPTION_MASTER_KEY ?? env.ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY or ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY must be set for PII encryption.',
    );
  }
  return key;
}

function getSearchKey(): string {
  return hkdfDeriveKey(getMasterKey(), KEY_CONTEXTS.piiSearch).toString('hex');
}

export function encryptPii(plaintext: string): string {
  return encryptV2(plaintext, getMasterKey(), KEY_CONTEXTS.piiEncryption);
}

export function decryptPii(ciphertext: string): string {
  return decryptV2(ciphertext, getMasterKey(), KEY_CONTEXTS.piiEncryption);
}

export function piiBlindIndex(plaintext: string): string {
  return blindIndex(plaintext.trim().toLowerCase(), getSearchKey());
}

/**
 * Decrypt a PII field with per-column fallback.
 * If ciphertext is present (not null/empty), decrypt it using v2.
 * Otherwise fall back to the plaintext column value.
 */
export function decryptPiiField(
  ciphertext: string | null,
  plaintext: string | null,
): string | null {
  if (ciphertext) {
    return decryptPii(ciphertext);
  }
  return plaintext ?? null;
}

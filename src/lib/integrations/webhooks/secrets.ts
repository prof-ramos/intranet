import 'server-only';

import { env } from '@/lib/env';
import { decrypt, encryptV2, decryptV2, V1_PREFIX, V2_PREFIX, KEY_CONTEXTS } from '@/lib/crypto';

export function encryptWebhookSecret(secret: string): string {
  // F-004 fix: Use V2 (HKDF, domain-separated) encryption for new secrets.
  // V1 used raw SHA-256 key derivation without domain separation.
  // V2 uses HKDF-SHA256 with KEY_CONTEXTS.webhookSecrets for domain separation.
  const masterKey = env.ENCRYPTION_MASTER_KEY?.trim();
  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY is required to encrypt webhook secrets.');
  }

  return encryptV2(secret, masterKey, KEY_CONTEXTS.webhookSecrets);
}

export function decryptWebhookSecret(secretCiphertext: string): string {
  // F-002 fix: Reject plaintext secrets that lack an encryption prefix.
  if (!secretCiphertext.startsWith(V1_PREFIX) && !secretCiphertext.startsWith(V2_PREFIX)) {
    throw new Error(
      'Webhook secret is not encrypted. All webhook secrets must be stored with an encryption prefix (enc:v1: or enc:v2:). ' +
        'Run the migration to re-encrypt plaintext secrets before dispatching webhooks.',
    );
  }

  const masterKey = env.ENCRYPTION_MASTER_KEY?.trim();
  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY is required to decrypt webhook secrets.');
  }

  // V2 (HKDF): preferred path
  if (secretCiphertext.startsWith(V2_PREFIX)) {
    return decryptV2(secretCiphertext, masterKey, KEY_CONTEXTS.webhookSecrets);
  }

  // V1 (legacy SHA-256): still supported for reading, but callers should
  // re-encrypt via encryptWebhookSecret to migrate to V2 on next write.
  // This allows a gradual migration without downtime.
  const legacyKey = env.ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY?.trim();
  if (!legacyKey) {
    throw new Error(
      'ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY is required to decrypt V1 webhook secrets. ' +
        'Set ENCRYPTION_MASTER_KEY for V2 and keep the legacy key until all secrets are migrated.',
    );
  }

  return decrypt(secretCiphertext, legacyKey);
}

/**
 * Returns true if the ciphertext uses V1 (legacy) encryption and should
 * be migrated to V2 on the next write. Use this to flag secrets that
 * need re-encryption.
 */
export function isV1WebhookSecret(secretCiphertext: string): boolean {
  return secretCiphertext.startsWith(V1_PREFIX);
}

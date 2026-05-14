import 'server-only';

import { env } from '@/lib/env';
import { decrypt, encrypt } from '@/lib/crypto';

export function encryptWebhookSecret(secret: string): string {
  const key = env.ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY?.trim();
  if (!key) {
    throw new Error('ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY is required to encrypt webhook secrets.');
  }

  return encrypt(secret, key);
}

export function decryptWebhookSecret(secretCiphertext: string): string {
  // Legacy plaintext secrets (no enc:v1: prefix) pass through without a key.
  if (!secretCiphertext.startsWith('enc:v1:')) {
    return secretCiphertext;
  }

  const key = env.ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY?.trim();
  if (!key) {
    throw new Error('ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY is required to decrypt webhook secrets.');
  }

  return decrypt(secretCiphertext, key);
}
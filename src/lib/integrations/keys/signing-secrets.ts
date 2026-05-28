import 'server-only';

import { randomBytes } from 'node:crypto';
import { decryptV2, encryptV2, KEY_CONTEXTS } from '@/lib/crypto';

const SIGNING_SECRET_BYTES = 32;

function getMasterKey(operation: 'encrypt' | 'decrypt'): string {
  const key = process.env.ENCRYPTION_MASTER_KEY?.trim();
  if (!key) {
    throw new Error(`ENCRYPTION_MASTER_KEY is required to ${operation} integration signing secrets.`);
  }
  return key;
}

export function generateIntegrationSigningSecret(): string {
  return randomBytes(SIGNING_SECRET_BYTES).toString('base64url');
}

export function encryptIntegrationSigningSecret(secret: string): string {
  return encryptV2(secret, getMasterKey('encrypt'), KEY_CONTEXTS.integrationSigningSecrets);
}

export function decryptIntegrationSigningSecret(secretCiphertext: string): string {
  return decryptV2(
    secretCiphertext,
    getMasterKey('decrypt'),
    KEY_CONTEXTS.integrationSigningSecrets,
  );
}

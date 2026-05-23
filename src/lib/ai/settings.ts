import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { appSettings } from '@/lib/db/schema/app-settings';
import { encryptV2, decryptV2, KEY_CONTEXTS } from '@/lib/crypto';
import { env } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai-settings');

const GEMINI_KEY_SETTING = 'gemini_api_key';

function getMasterKey(): string {
  const key = env.ENCRYPTION_MASTER_KEY?.trim();
  if (!key) throw new Error('ENCRYPTION_MASTER_KEY is required to manage app settings.');
  return key;
}

function encryptSettingValue(plaintext: string): string {
  return encryptV2(plaintext, getMasterKey(), KEY_CONTEXTS.appSettings);
}

function decryptSettingValue(ciphertext: string): string {
  return decryptV2(ciphertext, getMasterKey(), KEY_CONTEXTS.appSettings);
}

/** Returns the active Gemini API key, preferring env var over DB setting. */
export async function getGeminiApiKey(): Promise<string | null> {
  const envKey = env.GEMINI_API_KEY?.trim() || null;
  if (envKey) return envKey;

  const rows = await db
    .select({ valueCiphertext: appSettings.valueCiphertext })
    .from(appSettings)
    .where(eq(appSettings.key, GEMINI_KEY_SETTING))
    .limit(1);
  const row = rows[0] ?? null;

  if (!row) return null;
  return decryptSettingValue(row.valueCiphertext);
}

/** Returns true if a Gemini API key is configured (env or DB). */
export async function isGeminiConfigured(): Promise<boolean> {
  const key = await getGeminiApiKey();
  return key !== null && key.length > 0;
}

/** Upserts the Gemini API key in the DB. Key must be non-empty. */
export async function upsertGeminiApiKey(apiKey: string, updatedBy: number): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error('A chave da API Gemini não pode ser vazia.');
  if (!trimmed.startsWith('AIza'))
    throw new Error('Chave da API Gemini inválida: deve começar com "AIza".');

  const ciphertext = encryptSettingValue(trimmed);
  await db
    .insert(appSettings)
    .values({ key: GEMINI_KEY_SETTING, valueCiphertext: ciphertext, updatedBy })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { valueCiphertext: ciphertext, updatedBy, updatedAt: new Date() },
    });
  logger.info('Gemini API key upserted', { updatedBy });
}

/** Removes the Gemini API key from the DB. Falls back to env var if set. */
export async function deleteGeminiApiKey(): Promise<void> {
  await db.delete(appSettings).where(eq(appSettings.key, GEMINI_KEY_SETTING));
  logger.info('Gemini API key deleted');
}

/** Returns metadata about the current Gemini key (source, updatedAt) without exposing the key. */
export async function getGeminiKeyMeta(): Promise<{
  configured: boolean;
  source: 'env' | 'database' | null;
  updatedAt: Date | null;
} | null> {
  const envKey = env.GEMINI_API_KEY?.trim() || null;
  if (envKey) {
    return { configured: true, source: 'env', updatedAt: null };
  }

  const metaRows = await db
    .select({ updatedAt: appSettings.updatedAt })
    .from(appSettings)
    .where(eq(appSettings.key, GEMINI_KEY_SETTING))
    .limit(1);
  const row = metaRows[0] ?? null;

  if (!row) return { configured: false, source: null, updatedAt: null };
  return { configured: true, source: 'database', updatedAt: row.updatedAt };
}

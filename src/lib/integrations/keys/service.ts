import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { db, type DbExecutor } from '@/lib/db';
import { integrationApiKeys } from '@/lib/db/schema/integrations';

const VALID_SCOPES = ['events:read', 'events:write', 'webhooks:manage', 'health:read', 'admin'] as const;
export type IntegrationScope = (typeof VALID_SCOPES)[number];

const KEY_PREFIX = 'asof_';
const KEY_BYTES = 32;

function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

function validateScopes(scopes: string[]): IntegrationScope[] {
  if (!scopes || scopes.length === 0) {
    throw new Error('At least one scope must be selected.');
  }
  for (const scope of scopes) {
    if (!VALID_SCOPES.includes(scope as IntegrationScope)) {
      throw new Error(`Invalid scope: "${scope}". Valid scopes: ${VALID_SCOPES.join(', ')}`);
    }
  }
  return scopes as IntegrationScope[];
}

export interface CreateApiKeyResult {
  id: number;
  name: string;
  /** The raw API key — shown only once at creation time. */
  key: string;
  scopes: IntegrationScope[];
  isActive: boolean;
  createdAt: Date;
}

export interface ApiKeyListItem {
  id: number;
  name: string;
  scopes: IntegrationScope[];
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export async function createApiKey(
  name: string,
  scopes: string[],
  createdBy: number,
  executor: DbExecutor = db,
): Promise<CreateApiKeyResult> {
  const validatedScopes = validateScopes(scopes);
  const rawKey = `${KEY_PREFIX}${randomBytes(KEY_BYTES).toString('base64url')}`;
  const keyHash = hashKey(rawKey);

  const [row] = await executor
    .insert(integrationApiKeys)
    .values({
      name,
      keyHash,
      scopes: validatedScopes,
      isActive: true,
      createdBy,
    })
    .returning();

  return {
    id: row.id,
    name: row.name,
    key: rawKey,
    scopes: row.scopes as IntegrationScope[],
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

export async function listApiKeys(executor: DbExecutor = db): Promise<ApiKeyListItem[]> {
  const rows = await executor
    .select({
      id: integrationApiKeys.id,
      name: integrationApiKeys.name,
      scopes: integrationApiKeys.scopes,
      isActive: integrationApiKeys.isActive,
      lastUsedAt: integrationApiKeys.lastUsedAt,
      createdAt: integrationApiKeys.createdAt,
    })
    .from(integrationApiKeys)
    .orderBy(integrationApiKeys.createdAt);

  return rows.map((row) => ({
    ...row,
    scopes: row.scopes as IntegrationScope[],
  }));
}

export async function revokeApiKey(id: number, executor: DbExecutor = db): Promise<boolean> {
  const [updated] = await executor
    .update(integrationApiKeys)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(integrationApiKeys.id, id), eq(integrationApiKeys.isActive, true)))
    .returning({ id: integrationApiKeys.id });

  return !!updated;
}

export async function rotateApiKey(
  id: number,
  createdBy: number,
): Promise<CreateApiKeyResult | null> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        name: integrationApiKeys.name,
        scopes: integrationApiKeys.scopes,
        isActive: integrationApiKeys.isActive,
      })
      .from(integrationApiKeys)
      .where(eq(integrationApiKeys.id, id))
      .limit(1);

    if (!existing || !existing.isActive) {
      return null;
    }

    const rawKey = `${KEY_PREFIX}${randomBytes(KEY_BYTES).toString('base64url')}`;
    const keyHash = hashKey(rawKey);

    const [row] = await tx
      .insert(integrationApiKeys)
      .values({
        name: existing.name,
        keyHash,
        scopes: existing.scopes as IntegrationScope[],
        isActive: true,
        createdBy,
      })
      .returning();

    await tx
      .update(integrationApiKeys)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(integrationApiKeys.id, id));

    return {
      id: row.id,
      name: row.name,
      key: rawKey,
      scopes: row.scopes as IntegrationScope[],
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  });
}

export { VALID_SCOPES, hashKey };

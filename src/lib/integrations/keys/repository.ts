import 'server-only';

import { and, eq } from 'drizzle-orm';
import { db, type DbExecutor } from '@/lib/db';
import { integrationApiKeys } from '@/lib/db/schema/integrations';
import type { IntegrationScope } from '@/lib/integrations/keys/service';


export interface ActiveApiKeyRecord {
  id: number;
  name: string;
  keyHash: string;
  scopes: IntegrationScope[];
  isActive: boolean;
}

export async function findActiveApiKeyByHash(
  keyHash: string,
  executor: DbExecutor = db,
): Promise<ActiveApiKeyRecord | null> {
  const [row] = await executor
    .select({
      id: integrationApiKeys.id,
      name: integrationApiKeys.name,
      keyHash: integrationApiKeys.keyHash,
      scopes: integrationApiKeys.scopes,
      isActive: integrationApiKeys.isActive,
    })
    .from(integrationApiKeys)
    .where(and(eq(integrationApiKeys.keyHash, keyHash), eq(integrationApiKeys.isActive, true)))
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    scopes: row.scopes as IntegrationScope[],
  };
}

export async function updateApiKeyLastUsed(keyHash: string, executor: DbExecutor = db) {
  return executor
    .update(integrationApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(integrationApiKeys.keyHash, keyHash))
    .returning();
}
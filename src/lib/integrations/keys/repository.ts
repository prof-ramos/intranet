import 'server-only';

import { eq } from 'drizzle-orm';
import { db, type Tx } from '@/lib/db';
import { integrationApiKeys } from '@/lib/db/schema/integrations';

type WriteExecutor = Pick<Tx, 'insert' | 'update'>;

export async function updateApiKeyLastUsed(keyHash: string, executor: WriteExecutor = db) {
  return executor
    .update(integrationApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(integrationApiKeys.keyHash, keyHash))
    .returning();
}
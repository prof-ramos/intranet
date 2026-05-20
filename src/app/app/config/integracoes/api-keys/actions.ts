'use server';

import { requireAuth } from '@/lib/auth/require-auth';
import { requireRole } from '@/lib/auth/authorization';
import {
  createApiKey as createApiKeyService,
  listApiKeys as listApiKeysService,
  revokeApiKey as revokeApiKeyService,
  rotateApiKey as rotateApiKeyService,
  VALID_SCOPES,
} from '@/lib/integrations/keys/service';
import type { IntegrationScope } from '@/lib/integrations/keys/service';
import { revalidatePath } from 'next/cache';

export async function createApiKeyAction(name: string, scopes: string[]) {
  const actor = await requireAuth();
  await requireRole(['admin']);

  if (!name || name.trim().length < 2) {
    return { error: 'Name must be at least 2 characters.' };
  }

  if (!scopes || scopes.length === 0) {
    return { error: 'At least one scope must be selected.' };
  }

  const validScopes: IntegrationScope[] = [];
  for (const scope of scopes) {
    if (!VALID_SCOPES.includes(scope as IntegrationScope)) {
      return { error: `Invalid scope: "${scope}".` };
    }
    validScopes.push(scope as IntegrationScope);
  }

  try {
    const result = await createApiKeyService(name.trim(), validScopes, actor.userId);
    revalidatePath('/app/config/integracoes');
    return { data: result };
  } catch (err) {
    if (err instanceof Error && err.message.includes('unique')) {
      return { error: 'An API key with this name already exists.' };
    }
    return { error: 'Failed to create API key.' };
  }
}

export async function listApiKeysAction() {
  await requireAuth();
  await requireRole(['admin']);

  try {
    const data = await listApiKeysService();
    return { data };
  } catch {
    return { error: 'Failed to list API keys.' };
  }
}

export async function revokeApiKeyAction(id: number) {
  await requireAuth();
  await requireRole(['admin']);

  const revoked = await revokeApiKeyService(id);
  if (!revoked) {
    return { error: 'API key not found or already revoked.' };
  }
  revalidatePath('/app/config/integracoes');
  return { data: { id } };
}

export async function rotateApiKeyAction(id: number) {
  const actor = await requireAuth();
  await requireRole(['admin']);

  const result = await rotateApiKeyService(id, actor.userId);
  if (!result) {
    return { error: 'API key not found or already revoked.' };
  }
  revalidatePath('/app/config/integracoes');
  return { data: result };
}

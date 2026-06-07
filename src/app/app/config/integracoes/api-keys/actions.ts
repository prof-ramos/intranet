'use server';

import { revalidatePath } from 'next/cache';
import { defineServerAction } from '@/lib/server-actions/define-form-action';
import {
  createApiKey as createApiKeyService,
  listApiKeys as listApiKeysService,
  revokeApiKey as revokeApiKeyService,
  rotateApiKey as rotateApiKeyService,
  VALID_SCOPES,
} from '@/lib/integrations/keys/service';
import type { IntegrationScope } from '@/lib/integrations/keys/service';

const _createApiKeyAction = defineServerAction({
  auth: ['admin'],
  service: async (input: { name: string; scopes: string[] }, actor) => {
    const { name, scopes } = input;

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
  },
});

export async function createApiKeyAction(name: string, scopes: string[]) {
  return _createApiKeyAction({ name, scopes });
}

export const listApiKeysAction = defineServerAction({
  auth: ['admin'],
  service: async () => {
    try {
      const data = await listApiKeysService();
      return { data };
    } catch {
      return { error: 'Failed to list API keys.' };
    }
  },
});

export const revokeApiKeyAction = defineServerAction({
  auth: ['admin'],
  service: async (id: number) => {
    const revoked = await revokeApiKeyService(id);
    if (!revoked) {
      return { error: 'API key not found or already revoked.' };
    }
    revalidatePath('/app/config/integracoes');
    return { data: { id } };
  },
});

export const rotateApiKeyAction = defineServerAction({
  auth: ['admin'],
  service: async (id: number, actor) => {
    const result = await rotateApiKeyService(id, actor.userId);
    if (!result) {
      return { error: 'API key not found or already revoked.' };
    }
    revalidatePath('/app/config/integracoes');
    return { data: result };
  },
});

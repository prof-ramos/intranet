'use server';

import { revalidatePath } from 'next/cache';
import { defineFormStateAction } from '@/lib/server-actions/define-form-action';
import { upsertGeminiApiKey, deleteGeminiApiKey } from '@/lib/ai/settings';

type ActionState = { success: boolean; message: string };

export const saveGeminiApiKeyAction = defineFormStateAction({
  auth: ['admin'],
  service: async (_data, actor) => {
    const data = _data as Record<string, unknown>;
    const apiKey = (data.apiKey as string)?.trim() ?? '';
    if (!apiKey) {
      return { success: false, message: 'A chave da API não pode ser vazia.' };
    }
    if (!apiKey.startsWith('AIza')) {
      return { success: false, message: 'Chave inválida. Chaves Gemini começam com "AIza".' };
    }

    try {
      await upsertGeminiApiKey(apiKey, actor.userId);
      revalidatePath('/app/config/integracoes/ia');
      return { success: true, message: 'Chave da API Gemini salva com sucesso.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar a chave.';
      return { success: false, message };
    }
  },
  onError: (error) => ({
    success: false,
    message: error instanceof Error ? error.message : 'Falha ao salvar a chave.',
  }),
});

export const deleteGeminiApiKeyAction = defineFormStateAction({
  auth: ['admin'],
  service: async (_data, actor) => {
    try {
      await deleteGeminiApiKey(actor.userId);
      revalidatePath('/app/config/integracoes/ia');
      return { success: true, message: 'Chave da API Gemini removida.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao remover a chave.';
      return { success: false, message };
    }
  },
  onError: (error) => ({
    success: false,
    message: error instanceof Error ? error.message : 'Falha ao remover a chave.',
  }),
});

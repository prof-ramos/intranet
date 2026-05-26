'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/authorization';
import { upsertGeminiApiKey, deleteGeminiApiKey } from '@/lib/ai/settings';

type ActionState = { success: boolean; message: string } | null;

export async function saveGeminiApiKeyAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<NonNullable<ActionState>> {
  void _prevState;

  const actor = await requireRole(['admin']);

  const apiKey = formData.get('apiKey')?.toString().trim() ?? '';
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
}

export async function deleteGeminiApiKeyAction(
  _prevState: ActionState,
  _formData: FormData,
): Promise<NonNullable<ActionState>> {
  void _prevState;
  void _formData;

  const actor = await requireRole(['admin']);

  try {
    await deleteGeminiApiKey(actor.userId);
    revalidatePath('/app/config/integracoes/ia');
    return { success: true, message: 'Chave da API Gemini removida.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao remover a chave.';
    return { success: false, message };
  }
}

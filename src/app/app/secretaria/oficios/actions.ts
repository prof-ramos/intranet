'use server';

import { requireRole } from '@/lib/auth/authorization';
import * as service from '@/lib/oficios/service';
import * as repository from '@/lib/oficios/repository';
import { generateOfficialLetterContent } from '@/lib/ai/gemini';
import { env } from '@/lib/env';
import { officialLetterFormSchema, type OfficialLetterFormValues } from '@/lib/oficios/validations';
import { revalidatePath } from 'next/cache';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('oficios:actions');

const ALLOWED_ROLES = ['admin', 'diretoria', 'secretaria'] as const;
const MAX_OFFICIAL_LETTERS_LIMIT = 1000;

export async function getOfficialLettersAction(year?: number, limit?: number) {
  await requireRole(ALLOWED_ROLES);
  const safeLimit = limit != null ? Math.min(Math.max(1, Math.floor(limit)), MAX_OFFICIAL_LETTERS_LIMIT) : undefined;
  return repository.findOfficialLetters(year, { limit: safeLimit });
}

export async function getOfficialLetterAction(id: number) {
  await requireRole(ALLOWED_ROLES);
  return repository.findOfficialLetterById(id);
}

export async function generateAiTextAction(params: {
  recipient: string;
  recipientRole: string;
  subject: string;
  itamaratySector: string;
  instruction: string;
}) {
  await requireRole(ALLOWED_ROLES);
  if (!env.NEXT_PUBLIC_AI_ENABLED) {
    return { success: false, error: 'Funcionalidade de IA não está disponível.' };
  }
  try {
    return { success: true, text: await generateOfficialLetterContent(params) };
  } catch (error) {
    logger.error('[generateAiTextAction] AI generation failed', { error: toSafeErrorLog(error) }, error as Error);
    return { success: false, error: 'Falha ao gerar sugestão com IA.' };
  }
}

export async function saveOfficialLetterAction(values: OfficialLetterFormValues) {
  const user = await requireRole(ALLOWED_ROLES);
  
  const validated = officialLetterFormSchema.parse(values);
  
  try {
    const result = await service.saveOfficialLetter(validated, user.userId);
    revalidatePath('/app/secretaria/oficios');
    return { success: true, data: result };
  } catch (error) {
    logger.error('[saveOfficialLetterAction] save failed', { error: toSafeErrorLog(error) }, error as Error);
    return { success: false, error: 'Falha ao salvar o ofício.' };
  }
}

export async function updateOfficialLetterAction(id: number, values: Partial<OfficialLetterFormValues>) {
  const user = await requireRole(ALLOWED_ROLES);
  
  try {
    const result = await service.updateOfficialLetter(id, values, user.userId);
    revalidatePath('/app/secretaria/oficios');
    revalidatePath(`/app/secretaria/oficios/${id}/editar`);
    return { success: true, data: result };
  } catch (error) {
    logger.error('[updateOfficialLetterAction] update failed', { error: toSafeErrorLog(error) }, error as Error);
    return { success: false, error: 'Falha ao atualizar o ofício.' };
  }
}

export async function cancelOfficialLetterAction(id: number) {
  const user = await requireRole(ALLOWED_ROLES);
  
  try {
    const result = await service.cancelOfficialLetter(id, user.userId);
    revalidatePath('/app/secretaria/oficios');
    return { success: true, data: result };
  } catch (error) {
    logger.error('[cancelOfficialLetterAction] cancel failed', { error: toSafeErrorLog(error) }, error as Error);
    return { success: false, error: 'Falha ao cancelar o ofício.' };
  }
}

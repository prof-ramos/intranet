'use server';

import { revalidatePath } from 'next/cache';
import { defineServerAction } from '@/lib/server-actions/define-form-action';
import * as service from '@/lib/oficios/service';
import * as repository from '@/lib/oficios/repository';
import { generateOfficialLetterContent } from '@/lib/ai/gemini';
import { isGeminiConfigured } from '@/lib/ai/settings';
import { officialLetterFormSchema, type OfficialLetterFormValues } from '@/lib/oficios/validations';
import { z } from 'zod';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('oficios:actions');

const ALLOWED_ROLES = ['admin', 'diretoria', 'secretaria'] as const;
const MAX_OFFICIAL_LETTERS_LIMIT = 1000;

const _getOfficialLettersAction = defineServerAction({
  auth: ALLOWED_ROLES,
  service: async (input: { year?: number; limit?: number }) => {
    const safeLimit =
      input.limit != null
        ? Math.min(Math.max(1, Math.floor(input.limit)), MAX_OFFICIAL_LETTERS_LIMIT)
        : undefined;
    return repository.findOfficialLetters(input.year, { limit: safeLimit });
  },
});

export async function getOfficialLettersAction(year?: number, limit?: number) {
  return _getOfficialLettersAction({ year, limit });
}

export const getOfficialLetterAction = defineServerAction({
  auth: ALLOWED_ROLES,
  service: async (id: number) => {
    return repository.findOfficialLetterById(id);
  },
});

export const generateAiTextAction = defineServerAction({
  auth: ALLOWED_ROLES,
  service: async (params: {
    recipient: string;
    recipientRole: string;
    subject: string;
    itamaratySector: string;
    instruction: string;
  }) => {
    if (!(await isGeminiConfigured())) {
      return {
        success: false,
        error:
          'A chave da API Gemini não está configurada. Solicite ao administrador que configure em Configurações → Integrações → IA.',
      };
    }
    try {
      return { success: true, text: await generateOfficialLetterContent(params) };
    } catch (error) {
      logger.error(
        '[generateAiTextAction] AI generation failed',
        { error: toSafeErrorLog(error) },
        error instanceof Error ? error : undefined,
      );
      return { success: false, error: 'Falha ao gerar sugestão com IA.' };
    }
  },
});

export const saveOfficialLetterAction = defineServerAction({
  auth: ALLOWED_ROLES,
  schema: officialLetterFormSchema,
  service: async (validated: OfficialLetterFormValues, user) => {
    try {
      const result = await service.saveOfficialLetter(validated, user.userId);
      revalidatePath('/app/secretaria/oficios');
      return { success: true, data: result };
    } catch (error) {
      logger.error('[saveOfficialLetterAction] save failed', { error: toSafeErrorLog(error) }, error instanceof Error ? error : undefined);
      return { success: false, error: 'Falha ao salvar o ofício.' };
    }
  },
});

const _updateOfficialLetterAction = defineServerAction({
  auth: ALLOWED_ROLES,
  service: async (
    input: { id: number; values: Partial<OfficialLetterFormValues> },
    user,
  ) => {
    try {
      const result = await service.updateOfficialLetter(input.id, input.values, user.userId);
      revalidatePath('/app/secretaria/oficios');
      revalidatePath(`/app/secretaria/oficios/${input.id}/editar`);
      return { success: true, data: result };
    } catch (error) {
      logger.error(
        '[updateOfficialLetterAction] update failed',
        { error: toSafeErrorLog(error) },
        error instanceof Error ? error : undefined,
      );
      return { success: false, error: 'Falha ao atualizar o ofício.' };
    }
  },
});

export async function updateOfficialLetterAction(id: number, values: Partial<OfficialLetterFormValues>) {
  return _updateOfficialLetterAction({ id, values });
}

export const cancelOfficialLetterAction = defineServerAction({
  auth: ALLOWED_ROLES,
  service: async (id: number, user) => {
    try {
      const result = await service.cancelOfficialLetter(id, user.userId);
      revalidatePath('/app/secretaria/oficios');
      return { success: true, data: result };
    } catch (error) {
      logger.error(
        '[cancelOfficialLetterAction] cancel failed',
        { error: toSafeErrorLog(error) },
        error instanceof Error ? error : undefined,
      );
      return { success: false, error: 'Falha ao cancelar o ofício.' };
    }
  },
});

const signerEmailSchema = z.object({
  oficioId: z.number(),
  signerEmail: z.string().trim().email('Email inválido.'),
});

export const sendForSignatureAction = defineServerAction({
  auth: ALLOWED_ROLES,
  schema: signerEmailSchema,
  service: async (validated, user) => {
    try {
      const result = await service.sendForSignature(
        validated.oficioId,
        validated.signerEmail,
        user.userId,
      );
      if (!result.success) {
        return result;
      }
      revalidatePath('/app/secretaria/oficios');
      return result;
    } catch (error) {
      logger.error(
        '[sendForSignatureAction] send failed',
        { error: toSafeErrorLog(error) },
        error instanceof Error ? error : undefined,
      );
      return { success: false, error: 'Falha ao enviar ofício para assinatura.' };
    }
  },
});

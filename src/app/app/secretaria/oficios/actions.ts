'use server';

import { requireRole } from '@/lib/auth/authorization';
import * as service from '@/lib/oficios/service';
import * as repository from '@/lib/oficios/repository';
import { generateOfficialLetterContent } from '@/lib/ai/gemini';
import { officialLetterFormSchema, type OfficialLetterFormValues } from '@/lib/oficios/validations';
import { revalidatePath } from 'next/cache';

const ALLOWED_ROLES = ['admin', 'diretoria', 'secretaria'] as const;

export async function getOfficialLettersAction(year?: number, limit?: number) {
  await requireRole(ALLOWED_ROLES);
  return repository.findOfficialLetters(year, { limit });
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
  try {
    return { success: true, text: await generateOfficialLetterContent(params) };
  } catch (error) {
    console.error('AI Generation Error:', error);
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
    console.error('Save Official Letter Error:', error);
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
    console.error('Update Official Letter Error:', error);
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
    console.error('Cancel Official Letter Error:', error);
    return { success: false, error: 'Falha ao cancelar o ofício.' };
  }
}

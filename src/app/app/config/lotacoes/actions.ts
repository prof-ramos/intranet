'use server';

import { revalidatePath } from 'next/cache';
import { defineFormStateAction } from '@/lib/server-actions/define-form-action';
import {
  createAssignment as createAssignmentService,
  updateAssignment as updateAssignmentService,
  toggleAssignmentActive as toggleAssignmentActiveService,
} from '@/lib/assignments/service';

function parseAssignmentId(formData: Record<string, unknown>): number {
  const raw = (formData.id as string) ?? '';
  if (!/^\d+$/.test(raw)) {
    return Number.NaN;
  }
  return Number.parseInt(raw, 10);
}

type AssignmentState = { success: boolean; message: string };

export const createAssignment = defineFormStateAction({
  auth: ['admin', 'diretoria'],
  service: async (data, actor) => {
    const formData = data as Record<string, unknown>;
    const name = (formData.name as string)?.trim();
    const type = formData.type as string;

    if (!name || name.length < 2) {
      return { success: false, message: 'Nome da lotação é obrigatório (mínimo 2 caracteres).' };
    }

    if (type !== 'nacional' && type !== 'exterior') {
      return { success: false, message: 'Tipo de lotação inválido.' };
    }

    const result = await createAssignmentService({ name, type }, actor.userId);

    if (result.success) {
      revalidatePath('/app/config/lotacoes');
    }
    return result;
  },
  onError: () => ({ success: false, message: 'Falha ao criar lotação.' }),
});

export const updateAssignment = defineFormStateAction({
  auth: ['admin', 'diretoria'],
  service: async (data, actor) => {
    const formData = data as Record<string, unknown>;
    const id = parseAssignmentId(formData);
    const name = (formData.name as string)?.trim();
    const type = formData.type as string;

    if (!Number.isInteger(id) || id < 1) {
      return { success: false, message: 'Lotação inválida.' };
    }

    if (!name || name.length < 2) {
      return { success: false, message: 'Nome da lotação é obrigatório (mínimo 2 caracteres).' };
    }

    if (type !== 'nacional' && type !== 'exterior') {
      return { success: false, message: 'Tipo de lotação inválido.' };
    }

    const result = await updateAssignmentService({ id, name, type }, actor.userId);

    if (result.success) {
      revalidatePath('/app/config/lotacoes');
    }
    return result;
  },
  onError: () => ({ success: false, message: 'Falha ao atualizar lotação.' }),
});

export const toggleAssignmentActive = defineFormStateAction({
  auth: ['admin', 'diretoria'],
  service: async (data, actor) => {
    const formData = data as Record<string, unknown>;
    const id = parseAssignmentId(formData);

    if (!Number.isInteger(id) || id < 1) {
      return { success: false, message: 'Lotação inválida.' };
    }

    const result = await toggleAssignmentActiveService(id, actor.userId);

    if (result.success) {
      revalidatePath('/app/config/lotacoes');
    }
    return result;
  },
  onError: () => ({ success: false, message: 'Falha ao alterar status da lotação.' }),
});

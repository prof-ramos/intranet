'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { defineFormStateAction } from '@/lib/server-actions/define-form-action';
import {
  createAssignment as createAssignmentService,
  updateAssignment as updateAssignmentService,
  toggleAssignmentActive as toggleAssignmentActiveService,
} from '@/lib/assignments/service';
import { z } from 'zod';

const assignmentFields = {
  name: z.string().default(''),
  type: z.string().default(''),
};

const createAssignmentSchema = z.object(assignmentFields);
const updateAssignmentSchema = z.object({
  id: z.string().default(''),
  ...assignmentFields,
});
const assignmentIdSchema = z.object({ id: z.string().default('') });

function parseAssignmentId(raw: string): number {
  if (!/^\d+$/.test(raw)) {
    return Number.NaN;
  }
  return Number.parseInt(raw, 10);
}

function revalidateAssignments() {
  revalidateTag('associates', 'max');
  revalidateTag('dashboard:associates', 'max');
  revalidatePath('/app/config/lotacoes');
}

export const createAssignment = defineFormStateAction({
  auth: ['admin', 'diretoria'],
  schema: createAssignmentSchema,
  service: async (data, actor) => {
    const name = data.name.trim();
    const type = data.type;

    if (!name || name.length < 2) {
      return { success: false, message: 'Nome da lotação é obrigatório (mínimo 2 caracteres).' };
    }

    if (type !== 'nacional' && type !== 'exterior') {
      return { success: false, message: 'Tipo de lotação inválido.' };
    }

    const result = await createAssignmentService({ name, type }, actor.userId);

    if (result.success) {
      revalidateAssignments();
    }
    return result;
  },
  onError: () => ({ success: false, message: 'Falha ao criar lotação.' }),
});

export const updateAssignment = defineFormStateAction({
  auth: ['admin', 'diretoria'],
  schema: updateAssignmentSchema,
  service: async (data, actor) => {
    const id = parseAssignmentId(data.id);
    const name = data.name.trim();
    const type = data.type;

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
      revalidateAssignments();
    }
    return result;
  },
  onError: () => ({ success: false, message: 'Falha ao atualizar lotação.' }),
});

export const toggleAssignmentActive = defineFormStateAction({
  auth: ['admin', 'diretoria'],
  schema: assignmentIdSchema,
  service: async (data, actor) => {
    const id = parseAssignmentId(data.id);

    if (!Number.isInteger(id) || id < 1) {
      return { success: false, message: 'Lotação inválida.' };
    }

    const result = await toggleAssignmentActiveService(id, actor.userId);

    if (result.success) {
      revalidateAssignments();
    }
    return result;
  },
  onError: () => ({ success: false, message: 'Falha ao alterar status da lotação.' }),
});

'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/authorization';
import {
  createAssignment as createAssignmentService,
  updateAssignment as updateAssignmentService,
  toggleAssignmentActive as toggleAssignmentActiveService,
  AssignmentNotFoundError,
  DuplicateAssignmentNameError,
} from '@/lib/assignments/service';

function parseAssignmentId(formData: FormData): number {
  const raw = formData.get('id')?.toString() ?? '';
  if (!/^\d+$/.test(raw)) {
    return Number.NaN;
  }
  return Number.parseInt(raw, 10);
}

export async function createAssignment(
  _prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const actor = await requireRole(['admin', 'diretoria']);

  const name = formData.get('name')?.toString().trim();
  const type = formData.get('type')?.toString();

  if (!name || name.length < 2) {
    return { success: false, message: 'Nome da lotação é obrigatório (mínimo 2 caracteres).' };
  }

  if (type !== 'nacional' && type !== 'exterior') {
    return { success: false, message: 'Tipo de lotação inválido.' };
  }

  try {
    await createAssignmentService(name, type, actor.userId);
  } catch (error) {
    if (error instanceof DuplicateAssignmentNameError) {
      return { success: false, message: error.message };
    }
    throw error;
  }

  revalidatePath('/app/config/lotacoes');

  return { success: true, message: `Lotação "${name}" criada com sucesso.` };
}

export async function updateAssignment(
  _prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const actor = await requireRole(['admin', 'diretoria']);

  const id = parseAssignmentId(formData);
  const name = formData.get('name')?.toString().trim();
  const type = formData.get('type')?.toString();

  if (!Number.isInteger(id) || id < 1) {
    return { success: false, message: 'Lotação inválida.' };
  }

  if (!name || name.length < 2) {
    return { success: false, message: 'Nome da lotação é obrigatório (mínimo 2 caracteres).' };
  }

  if (type !== 'nacional' && type !== 'exterior') {
    return { success: false, message: 'Tipo de lotação inválido.' };
  }

  try {
    await updateAssignmentService(id, name, type, actor.userId);
  } catch (error) {
    if (error instanceof AssignmentNotFoundError) {
      return { success: false, message: error.message };
    }
    if (error instanceof DuplicateAssignmentNameError) {
      return { success: false, message: error.message };
    }
    throw error;
  }

  revalidatePath('/app/config/lotacoes');

  return { success: true, message: `Lotação "${name}" atualizada com sucesso.` };
}

export async function toggleAssignmentActive(
  _prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const actor = await requireRole(['admin', 'diretoria']);

  const id = parseAssignmentId(formData);

  if (!Number.isInteger(id) || id < 1) {
    return { success: false, message: 'Lotação inválida.' };
  }

  try {
    const result = await toggleAssignmentActiveService(id, actor.userId);

    revalidatePath('/app/config/lotacoes');

    return {
      success: true,
      message: `Lotação "${result.name}" foi ${result.newState ? 'ativada' : 'desativada'} com sucesso.`,
    };
  } catch (error) {
    if (error instanceof AssignmentNotFoundError) {
      return { success: false, message: error.message };
    }
    throw error;
  }
}

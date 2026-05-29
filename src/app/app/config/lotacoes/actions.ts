'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/authorization';
import {
  createAssignment as createAssignmentService,
  updateAssignment as updateAssignmentService,
  toggleAssignmentActive as toggleAssignmentActiveService,
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

  const result = await createAssignmentService({ name, type }, actor.userId);

  if (result.success) {
    revalidatePath('/app/config/lotacoes');
  }

  return result;
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

  const result = await updateAssignmentService({ id, name, type }, actor.userId);

  if (result.success) {
    revalidatePath('/app/config/lotacoes');
  }

  return result;
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

  const result = await toggleAssignmentActiveService(id, actor.userId);

  if (result.success) {
    revalidatePath('/app/config/lotacoes');
  }

  return result;
}

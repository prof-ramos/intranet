'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-auth';
import {
  createDependent,
  updateDependentById,
  deleteDependentById,
  createHealthAgreement,
  updateHealthAgreementById,
  deleteHealthAgreementById,
} from '@/lib/associates/repository';
import {
  createDependentSchema,
  updateDependentSchema,
  deleteDependentSchema,
  createHealthAgreementSchema,
  updateHealthAgreementSchema,
  deleteHealthAgreementSchema,
} from '@/lib/validation/schemas';

const ALLOWED_ROLES = ['admin', 'diretoria', 'secretaria'] as const;

function checkRole(role: string): void {
  if (!ALLOWED_ROLES.includes(role as typeof ALLOWED_ROLES[number])) {
    throw new Error('Permissão insuficiente.');
  }
}

// ─── Dependent Actions ──────────────────────────────────────────────────

export async function addDependentAction(formData: FormData) {
  const user = await requireAuth();
  checkRole(user.role);

  const data = createDependentSchema.parse({
    associateId: formData.get('associateId'),
    name: formData.get('name'),
    relationship: formData.get('relationship'),
  });

  await createDependent(data);

  revalidatePath(`/app/associados/${data.associateId}`);
  revalidatePath(`/app/associados/${data.associateId}/editar`);
}

export async function editDependentAction(formData: FormData) {
  const user = await requireAuth();
  checkRole(user.role);

  const associateId = formData.get('associateId')?.toString();
  const data = updateDependentSchema.parse({
    id: formData.get('id'),
    name: formData.get('name') || undefined,
    relationship: formData.get('relationship') || undefined,
  });

  const { id, ...values } = data;
  if (Object.keys(values).length === 0) return;

  await updateDependentById(id, values, associateId ? Number(associateId) : undefined);

  revalidatePath('/app/associados');
  if (associateId) {
    revalidatePath(`/app/associados/${associateId}`);
    revalidatePath(`/app/associados/${associateId}/editar`);
  }
}

export async function removeDependentAction(formData: FormData) {
  const user = await requireAuth();
  checkRole(user.role);

  const associateId = formData.get('associateId')?.toString();
  const data = deleteDependentSchema.parse({
    id: formData.get('id'),
  });

  await deleteDependentById(data.id, associateId ? Number(associateId) : undefined);

  revalidatePath('/app/associados');
  if (associateId) {
    revalidatePath(`/app/associados/${associateId}`);
    revalidatePath(`/app/associados/${associateId}/editar`);
  }
}

// ─── Health Agreement Actions ────────────────────────────────────────────

export async function addHealthAgreementAction(formData: FormData) {
  const user = await requireAuth();
  checkRole(user.role);

  const data = createHealthAgreementSchema.parse({
    associateId: formData.get('associateId'),
    provider: formData.get('provider'),
    startDate: formData.get('startDate') || null,
    endDate: formData.get('endDate') || null,
  });

  await createHealthAgreement(data);

  revalidatePath(`/app/associados/${data.associateId}`);
  revalidatePath(`/app/associados/${data.associateId}/editar`);
}

export async function editHealthAgreementAction(formData: FormData) {
  const user = await requireAuth();
  checkRole(user.role);

  const associateId = formData.get('associateId')?.toString();
  const data = updateHealthAgreementSchema.parse({
    id: formData.get('id'),
    provider: formData.get('provider') || undefined,
    startDate: formData.get('startDate') || null,
    endDate: formData.get('endDate') || null,
  });

  const { id, ...values } = data;
  if (Object.keys(values).length === 0) return;

  await updateHealthAgreementById(id, values, associateId ? Number(associateId) : undefined);

  revalidatePath('/app/associados');
  if (associateId) {
    revalidatePath(`/app/associados/${associateId}`);
    revalidatePath(`/app/associados/${associateId}/editar`);
  }
}

export async function removeHealthAgreementAction(formData: FormData) {
  const user = await requireAuth();
  checkRole(user.role);

  const associateId = formData.get('associateId')?.toString();
  const data = deleteHealthAgreementSchema.parse({
    id: formData.get('id'),
  });

  await deleteHealthAgreementById(data.id, associateId ? Number(associateId) : undefined);

  revalidatePath('/app/associados');
  if (associateId) {
    revalidatePath(`/app/associados/${associateId}`);
    revalidatePath(`/app/associados/${associateId}/editar`);
  }
}

'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
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

function revalidateAssociatePaths(associateId: number) {
  revalidatePath('/app/associados');
  revalidatePath(`/app/associados/${associateId}`);
  revalidatePath(`/app/associados/${associateId}/editar`);
  revalidateTag('associates', 'max');
  revalidateTag('dashboard', 'max');
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

  revalidateAssociatePaths(data.associateId);
}

export async function editDependentAction(formData: FormData) {
  const user = await requireAuth();
  checkRole(user.role);

  const data = updateDependentSchema.parse({
    id: formData.get('id'),
    associateId: formData.get('associateId'),
    name: formData.get('name') || undefined,
    relationship: formData.get('relationship') || undefined,
  });

  const { id, associateId, ...values } = data;
  if (Object.keys(values).length === 0) return;

  await updateDependentById(id, values, associateId);

  revalidateAssociatePaths(associateId);
}

export async function removeDependentAction(formData: FormData) {
  const user = await requireAuth();
  checkRole(user.role);

  const data = deleteDependentSchema.parse({
    id: formData.get('id'),
    associateId: formData.get('associateId'),
  });

  await deleteDependentById(data.id, data.associateId);

  revalidateAssociatePaths(data.associateId);
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

  revalidateAssociatePaths(data.associateId);
}

export async function editHealthAgreementAction(formData: FormData) {
  const user = await requireAuth();
  checkRole(user.role);

  const data = updateHealthAgreementSchema.parse({
    id: formData.get('id'),
    associateId: formData.get('associateId'),
    provider: formData.get('provider') || undefined,
    startDate: formData.get('startDate') || null,
    endDate: formData.get('endDate') || null,
  });

  const { id, associateId, ...values } = data;
  if (Object.keys(values).length === 0) return;

  await updateHealthAgreementById(id, values, associateId);

  revalidateAssociatePaths(associateId);
}

export async function removeHealthAgreementAction(formData: FormData) {
  const user = await requireAuth();
  checkRole(user.role);

  const data = deleteHealthAgreementSchema.parse({
    id: formData.get('id'),
    associateId: formData.get('associateId'),
  });

  await deleteHealthAgreementById(data.id, data.associateId);

  revalidateAssociatePaths(data.associateId);
}

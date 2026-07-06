'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { defineFormAction } from '@/lib/server-actions/define-form-action';
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

function revalidateAssociatePaths(associateId: number) {
  revalidatePath('/app/associados');
  revalidatePath(`/app/associados/${associateId}`);
  revalidatePath(`/app/associados/${associateId}/editar`);
  revalidateTag('associates', 'max');
  revalidateTag('dashboard', 'max');
}

// ─── Dependent Actions ──────────────────────────────────────────────────

export const addDependentAction = defineFormAction({
  auth: ['admin', 'diretoria', 'secretaria'] as const,
  schema: createDependentSchema,
  service: async (data) => {
    await createDependent(data);
    revalidateAssociatePaths(data.associateId);
  },
});

export const editDependentAction = defineFormAction({
  auth: ['admin', 'diretoria', 'secretaria'] as const,
  schema: updateDependentSchema,
  service: async (data) => {
    const { id, associateId, ...values } = data;
    if (Object.keys(values).length === 0) return;
    await updateDependentById(id, values, associateId);
    revalidateAssociatePaths(associateId);
  },
});

export const removeDependentAction = defineFormAction({
  auth: ['admin', 'diretoria', 'secretaria'] as const,
  schema: deleteDependentSchema,
  service: async (data) => {
    await deleteDependentById(data.id, data.associateId);
    revalidateAssociatePaths(data.associateId);
  },
});

// ─── Health Agreement Actions ────────────────────────────────────────────

export const addHealthAgreementAction = defineFormAction({
  auth: ['admin', 'diretoria', 'secretaria'] as const,
  schema: createHealthAgreementSchema,
  preprocess: (raw) => {
    const r = { ...raw } as Record<string, unknown>;
    if (r.endDate === '') r.endDate = null;
    return r;
  },
  service: async (data) => {
    await createHealthAgreement(data);
    revalidateAssociatePaths(data.associateId);
  },
});

export const editHealthAgreementAction = defineFormAction({
  auth: ['admin', 'diretoria', 'secretaria'] as const,
  schema: updateHealthAgreementSchema,
  preprocess: (raw) => {
    const r = { ...raw } as Record<string, unknown>;
    if (r.endDate === '') r.endDate = undefined;
    return r;
  },
  service: async (data) => {
    const { id, associateId, ...values } = data;
    if (Object.keys(values).length === 0) return;
    await updateHealthAgreementById(id, values, associateId);
    revalidateAssociatePaths(associateId);
  },
});

export const removeHealthAgreementAction = defineFormAction({
  auth: ['admin', 'diretoria', 'secretaria'] as const,
  schema: deleteHealthAgreementSchema,
  service: async (data) => {
    await deleteHealthAgreementById(data.id, data.associateId);
    revalidateAssociatePaths(data.associateId);
  },
});

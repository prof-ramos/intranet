'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import type { z } from 'zod';
import { defineFormAction } from '@/lib/server-actions/define-form-action';
import { updateAssociateSchema, createAssociateSchema } from '@/lib/validation/schemas';
import { updateAssociateData, createAssociateData, toJoinedAtTimestamp } from '@/lib/associates/service';
import { emptyToNull } from '@/lib/utils/strings';

function asStringList(value: unknown): string[] {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}

/** Emparelha campos multi-valor do form em lista de dependentes. */
export function pairDependentsFromForm(raw: Record<string, unknown>): Array<{ name: string; relationship: string }> {
  const names = asStringList(raw.dependentName);
  const relationships = asStringList(raw.dependentRelationship);
  const len = Math.max(names.length, relationships.length);
  const out: Array<{ name: string; relationship: string }> = [];
  for (let i = 0; i < len; i++) {
    const name = (names[i] ?? '').trim();
    const relationship = (relationships[i] ?? '').trim();
    if (!name && !relationship) continue;
    out.push({ name, relationship });
  }
  return out;
}

type AssociateFormPayload = Omit<z.infer<typeof createAssociateSchema>, 'dependents'> & {
  id?: number;
};

function mapFormToServiceFields(data: AssociateFormPayload, role: string) {
  return {
    fullName: data.fullName,
    cpf: data.cpf ?? null,
    rg: data.rg ?? null,
    rgIssuer: data.rgIssuer ?? null,
    rgState: data.rgState ?? null,
    rgExpeditionDate: emptyToNull(data.rgExpeditionDate),
    siape: data.siape ?? null,
    sex: emptyToNull(data.sex),
    maritalStatus: emptyToNull(data.maritalStatus),
    birthDate: emptyToNull(data.birthDate),
    birthCity: data.birthCity ?? null,
    birthState: data.birthState ?? null,
    primaryEmail: emptyToNull(data.primaryEmail),
    secondaryEmail: emptyToNull(data.secondaryEmail),
    phone: data.phone ?? null,
    whatsapp: data.whatsapp ?? null,
    address: data.address ?? null,
    neighborhood: data.neighborhood ?? null,
    addressState: data.addressState ?? null,
    zipCode: data.zipCode ?? null,
    locationCity: data.locationCity ?? null,
    locationCountry: data.locationCountry ?? null,
    assignment: data.assignment ?? null,
    assignmentStartDate: emptyToNull(data.assignmentStartDate),
    classPattern: data.classPattern ?? null,
    associationCategory: data.associationCategory ?? null,
    functionalStatus: emptyToNull(data.functionalStatus),
    associationStatus: data.associationStatus ?? undefined,
    contributionStatus: data.contributionStatus ?? undefined,
    paymentMethod: data.paymentMethod === '' ? undefined : data.paymentMethod ?? undefined,
    missionType: emptyToNull(data.missionType),
    careerOrigin: emptyToNull(data.careerOrigin),
    admissionDate: emptyToNull(data.admissionDate),
    inaugurationDate: emptyToNull(data.inaugurationDate),
    retirementDate: emptyToNull(data.retirementDate),
    cancellationDate: emptyToNull(data.cancellationDate),
    leaveDate: emptyToNull(data.leaveDate),
    joinedAt: toJoinedAtTimestamp(emptyToNull(data.joinedAt)),
    ceocMember: data.ceocMember,
    caocMember: data.caocMember,
    internalNotes: role === 'admin' ? (data.internalNotes ?? null) : undefined,
  };
}

export const updateAssociate = defineFormAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: updateAssociateSchema,
  service: async (data, actor) => {
    await updateAssociateData({
      id: data.id,
      ...mapFormToServiceFields(data, actor.role),
      updatedBy: actor.userId,
    });

    revalidatePath('/app/associados');
    revalidatePath(`/app/associados/${data.id}`);
    revalidateTag('associates', 'max');
    revalidateTag('dashboard', 'max');

    return data.id;
  },
  revalidate: ['/app/associados'],
  redirect: (id) => `/app/associados/${id}`,
});

export const createAssociate = defineFormAction({
  auth: ['admin', 'secretaria'],
  schema: createAssociateSchema,
  preprocess: (raw) => {
    const next = { ...raw } as Record<string, unknown>;
    next.dependents = pairDependentsFromForm(raw);
    delete next.dependentName;
    delete next.dependentRelationship;
    return next;
  },
  service: async (data, actor) => {
    const { dependents, ...fields } = data;
    const { id } = await createAssociateData({
      ...mapFormToServiceFields(fields, actor.role),
      dependents: dependents ?? [],
      createdBy: actor.userId,
    });

    revalidatePath('/app/associados');
    revalidateTag('associates', 'max');
    revalidateTag('dashboard', 'max');

    return id;
  },
  revalidate: ['/app/associados'],
  redirect: (id) => `/app/associados/${id}`,
});

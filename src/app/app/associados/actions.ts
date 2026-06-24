'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import type { z } from 'zod';
import { defineFormAction } from '@/lib/server-actions/define-form-action';
import { updateAssociateSchema, createAssociateSchema } from '@/lib/validation/schemas';
import { updateAssociateData, createAssociateData } from '@/lib/associates/service';
import { emptyToNull } from '@/lib/utils/strings';

function mapFormToServiceFields(
  data: z.infer<typeof createAssociateSchema>,
  role: string,
) {
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
  service: async (data, actor) => {
    const { id } = await createAssociateData({
      ...mapFormToServiceFields(data, actor.role),
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

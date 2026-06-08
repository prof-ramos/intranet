'use server';

import { revalidatePath } from 'next/cache';
import { defineFormAction } from '@/lib/server-actions/define-form-action';
import { updateAssociateSchema } from '@/lib/validation/schemas';
import { updateAssociateData } from '@/lib/associates/service';

export const updateAssociate = defineFormAction({
  auth: ['admin', 'diretoria'],
  schema: updateAssociateSchema,
  service: async (data, actor) => {
    const functionalStatus = data.functionalStatus === '' ? null : data.functionalStatus;

    await updateAssociateData({
      id: data.id,
      fullName: data.fullName,
      cpf: data.cpf ?? null,
      siape: data.siape ?? null,
      primaryEmail: data.primaryEmail ?? null,
      secondaryEmail: data.secondaryEmail ?? null,
      phone: data.phone ?? null,
      whatsapp: data.whatsapp ?? null,
      birthDate: data.birthDate ?? null,
      address: data.address ?? null,
      locationCity: data.locationCity ?? null,
      locationCountry: data.locationCountry ?? null,
      assignment: data.assignment ?? null,
      assignmentStartDate: data.assignmentStartDate ?? null,
      classPattern: data.classPattern ?? null,
      associationCategory: data.associationCategory ?? null,
      functionalStatus: functionalStatus ?? null,
      associationStatus: data.associationStatus ?? null,
      contributionStatus: data.contributionStatus ?? null,
      internalNotes: actor.role === 'admin' ? (data.internalNotes ?? null) : undefined,
      updatedBy: actor.userId,
    });

    revalidatePath('/app/associados');
    revalidatePath(`/app/associados/${data.id}`);

    return data.id;
  },
  revalidate: ['/app/associados'],
  redirect: (id) => `/app/associados/${id}`,
});

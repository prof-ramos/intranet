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
    const sex = data.sex === '' ? null : data.sex;
    const maritalStatus = data.maritalStatus === '' ? null : data.maritalStatus;
    const missionType = data.missionType === '' ? null : data.missionType;
    const careerOrigin = data.careerOrigin === '' ? null : data.careerOrigin;
    const paymentMethod = data.paymentMethod === '' ? null : data.paymentMethod;

    await updateAssociateData({
      id: data.id,
      fullName: data.fullName,
      cpf: data.cpf ?? null,
      rg: data.rg ?? null,
      rgIssuer: data.rgIssuer ?? null,
      rgState: data.rgState ?? null,
      rgExpeditionDate: data.rgExpeditionDate ?? null,
      siape: data.siape ?? null,
      sex,
      maritalStatus,
      birthDate: data.birthDate ?? null,
      birthCity: data.birthCity ?? null,
      birthState: data.birthState ?? null,
      primaryEmail: data.primaryEmail ?? null,
      secondaryEmail: data.secondaryEmail ?? null,
      phone: data.phone ?? null,
      whatsapp: data.whatsapp ?? null,
      address: data.address ?? null,
      neighborhood: data.neighborhood ?? null,
      addressState: data.addressState ?? null,
      zipCode: data.zipCode ?? null,
      locationCity: data.locationCity ?? null,
      locationCountry: data.locationCountry ?? null,
      assignment: data.assignment ?? null,
      assignmentStartDate: data.assignmentStartDate ?? null,
      classPattern: data.classPattern ?? null,
      associationCategory: data.associationCategory ?? null,
      functionalStatus: functionalStatus ?? null,
      associationStatus: data.associationStatus ?? null,
      contributionStatus: data.contributionStatus ?? null,
      paymentMethod,
      missionType,
      careerOrigin,
      admissionDate: data.admissionDate ?? null,
      inaugurationDate: data.inaugurationDate ?? null,
      cancellationDate: data.cancellationDate ?? null,
      ceocMember: data.ceocMember,
      caocMember: data.caocMember,
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

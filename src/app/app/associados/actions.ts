'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { defineFormAction } from '@/lib/server-actions/define-form-action';
import { updateAssociateSchema, createAssociateSchema } from '@/lib/validation/schemas';
import { updateAssociateData, createAssociateData } from '@/lib/associates/service';

export const updateAssociate = defineFormAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: updateAssociateSchema,
  service: async (data, actor) => {
    const functionalStatus = data.functionalStatus === '' ? null : data.functionalStatus;
    const sex = data.sex === '' ? null : data.sex;
    const maritalStatus = data.maritalStatus === '' ? null : data.maritalStatus;
    const missionType = data.missionType === '' ? null : data.missionType;
    const careerOrigin = data.careerOrigin === '' ? null : data.careerOrigin;
    const paymentMethod = data.paymentMethod === '' ? null : data.paymentMethod;

    const emptyToNull = (v: string | null | undefined) => (v === '' ? null : v ?? null);

    await updateAssociateData({
      id: data.id,
      fullName: data.fullName,
      cpf: data.cpf ?? null,
      rg: data.rg ?? null,
      rgIssuer: data.rgIssuer ?? null,
      rgState: data.rgState ?? null,
      rgExpeditionDate: emptyToNull(data.rgExpeditionDate),
      siape: data.siape ?? null,
      sex,
      maritalStatus,
      birthDate: emptyToNull(data.birthDate),
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
      assignmentStartDate: emptyToNull(data.assignmentStartDate),
      classPattern: data.classPattern ?? null,
      associationCategory: data.associationCategory ?? null,
      functionalStatus: functionalStatus ?? null,
      associationStatus: data.associationStatus ?? null,
      contributionStatus: data.contributionStatus ?? null,
      paymentMethod,
      missionType,
      careerOrigin,
      admissionDate: emptyToNull(data.admissionDate),
      inaugurationDate: emptyToNull(data.inaugurationDate),
      retirementDate: emptyToNull(data.retirementDate),
      cancellationDate: emptyToNull(data.cancellationDate),
      ceocMember: data.ceocMember,
      caocMember: data.caocMember,
      internalNotes: actor.role === 'admin' ? (data.internalNotes ?? null) : undefined,
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
    const functionalStatus = data.functionalStatus === '' ? null : data.functionalStatus;
    const sex = data.sex === '' ? null : data.sex;
    const maritalStatus = data.maritalStatus === '' ? null : data.maritalStatus;
    const missionType = data.missionType === '' ? null : data.missionType;
    const careerOrigin = data.careerOrigin === '' ? null : data.careerOrigin;
    const paymentMethod = data.paymentMethod === '' ? null : data.paymentMethod;

    const emptyToNull = (v: string | null | undefined) => (v === '' ? null : v ?? null);

    const { id } = await createAssociateData({
      fullName: data.fullName,
      cpf: data.cpf ?? null,
      rg: data.rg ?? null,
      rgIssuer: data.rgIssuer ?? null,
      rgState: data.rgState ?? null,
      rgExpeditionDate: emptyToNull(data.rgExpeditionDate),
      siape: data.siape ?? null,
      sex,
      maritalStatus,
      birthDate: emptyToNull(data.birthDate),
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
      assignmentStartDate: emptyToNull(data.assignmentStartDate),
      classPattern: data.classPattern ?? null,
      associationCategory: data.associationCategory ?? null,
      functionalStatus: functionalStatus ?? null,
      associationStatus: data.associationStatus ?? null,
      contributionStatus: data.contributionStatus ?? null,
      paymentMethod,
      missionType,
      careerOrigin,
      admissionDate: emptyToNull(data.admissionDate),
      inaugurationDate: emptyToNull(data.inaugurationDate),
      retirementDate: emptyToNull(data.retirementDate),
      cancellationDate: emptyToNull(data.cancellationDate),
      ceocMember: data.ceocMember,
      caocMember: data.caocMember,
      internalNotes: actor.role === 'admin' ? (data.internalNotes ?? null) : undefined,
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

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/authorization';
import { parseFormAction } from '@/lib/server-actions/utils';
import { updateAssociateSchema } from '@/lib/validation/schemas';
import { updateAssociateData } from '@/lib/associates/service';

export async function updateAssociate(formData: FormData) {
  const actor = await requireRole(['admin', 'diretoria']);

  const data = parseFormAction(formData, updateAssociateSchema);
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
    // internalNotes is admin-only: diretoria submissions have this field stripped.
    internalNotes: actor.role === 'admin' ? (data.internalNotes ?? null) : undefined,
    updatedBy: actor.userId,
  });

  revalidatePath('/app/associados');
  revalidatePath(`/app/associados/${data.id}`);

  redirect(`/app/associados/${data.id}`);
}

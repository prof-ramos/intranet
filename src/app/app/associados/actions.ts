'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { associates } from '@/lib/db/schema';
import { formDataToRecord, firstZodError } from '@/lib/server-actions/utils';
import { updateAssociateSchema } from '@/lib/validation/schemas';

/**
 * Atualiza os dados editáveis de um associado.
 * Apenas admin e diretoria podem executar esta ação.
 */
export async function updateAssociate(formData: FormData) {
  await requireRole(['admin', 'diretoria']);

  const raw = formDataToRecord(formData);

  const parsed = updateAssociateSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(firstZodError(parsed.error.issues));
  }

  const {
    id,
    fullName,
    cpf,
    siape,
    primaryEmail,
    secondaryEmail,
    phone,
    whatsapp,
    birthDate,
    address,
    locationCity,
    locationCountry,
    assignment,
    assignmentStartDate,
    classPattern,
    associationCategory,
    functionalStatus,
    associationStatus,
    contributionStatus,
  } = parsed.data;

  const set: Record<string, unknown> = {
    fullName,
    cpf,
    siape,
    primaryEmail,
    secondaryEmail,
    phone,
    whatsapp,
    birthDate,
    address,
    locationCity,
    locationCountry,
    assignment,
    assignmentStartDate,
    classPattern,
    associationCategory,
    updatedAt: new Date(),
  };

  if (functionalStatus) set.functionalStatus = functionalStatus;
  if (associationStatus) set.associationStatus = associationStatus;
  if (contributionStatus) set.contributionStatus = contributionStatus;

  try {
    await db.update(associates).set(set).where(eq(associates.id, id));
  } catch (err) {
    console.error('[updateAssociate] DB error for id:', id, err);
    throw new Error('Falha ao atualizar o associado. Tente novamente.');
  }

  revalidatePath('/app/associados');
  revalidatePath(`/app/associados/${id}`);

  redirect(`/app/associados/${id}`);
}

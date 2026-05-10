'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { legalConsultations, legalNotes } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

async function generateInternalNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const [result] = await db
    .select({
      max: sql<string>`max(substring(${legalConsultations.internalNumber} from 'JUR-${year}-([0-9]+)')::integer)`,
    })
    .from(legalConsultations)
    .where(sql`${legalConsultations.internalNumber} like ${`JUR-${year}-%`}`);

  const next = (Number(result?.max) || 0) + 1;
  return `JUR-${year}-${String(next).padStart(3, '0')}`;
}

export async function createConsultation(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const questionSummary = String(formData.get('questionSummary') ?? '').trim();
  const questionFullText = String(formData.get('questionFullText') ?? '').trim() || null;
  const associateIdRaw = formData.get('associateId');
  const associateId = associateIdRaw ? Number(associateIdRaw) : null;
  const slaDaysRaw = formData.get('slaDays');
  const slaDays = slaDaysRaw ? Number(slaDaysRaw) : 7;
  const createdBy = Number(formData.get('createdBy'));

  if (!title || !questionSummary || !createdBy || Number.isNaN(createdBy)) {
    throw new Error('Campos obrigatórios ausentes.');
  }

  const internalNumber = await generateInternalNumber();
  const slaDueDate = new Date();
  slaDueDate.setDate(slaDueDate.getDate() + slaDays);

  const [inserted] = await db
    .insert(legalConsultations)
    .values({
      internalNumber,
      title,
      questionSummary,
      questionFullText,
      associateId,
      slaDueDate,
      createdBy,
      lastInteractionAt: new Date(),
    })
    .returning({ id: legalConsultations.id });

  revalidatePath('/app/juridico');
  revalidatePath('/app/juridico/consultas');

  redirect(`/app/juridico/consultas/${inserted.id}`);
}

export async function updateConsultationStatus(id: number, status: string) {
  await db
    .update(legalConsultations)
    .set({
      status: status as 'aberta' | 'aguardando_escritorio' | 'respondida' | 'arquivada',
      updatedAt: new Date(),
      ...(status === 'respondida' ? { lastInteractionAt: new Date() } : {}),
    })
    .where(eq(legalConsultations.id, id));

  revalidatePath('/app/juridico');
  revalidatePath('/app/juridico/consultas');
  revalidatePath(`/app/juridico/consultas/${id}`);
}

export async function updateConsultationStatusFromForm(formData: FormData) {
  const id = Number(formData.get('id'));
  const status = String(formData.get('status') ?? '');
  if (!id || !status) {
    throw new Error('Campos obrigatórios ausentes.');
  }
  await updateConsultationStatus(id, status);
}

export async function addNote(formData: FormData) {
  const entityType = String(formData.get('entityType') ?? '');
  const entityId = Number(formData.get('entityId'));
  const content = String(formData.get('content') ?? '').trim();
  const createdBy = Number(formData.get('createdBy'));
  const isEscritorioResponse = formData.get('isEscritorioResponse') === 'true';

  if (!entityType || !entityId || !content || !createdBy || Number.isNaN(createdBy)) {
    throw new Error('Campos obrigatórios ausentes.');
  }

  await db.insert(legalNotes).values({
    entityType,
    entityId,
    content,
    createdBy,
    isEscritorioResponse,
  });

  if (entityType === 'consultation') {
    await db
      .update(legalConsultations)
      .set({ lastInteractionAt: new Date(), updatedAt: new Date() })
      .where(eq(legalConsultations.id, entityId));
  }

  revalidatePath('/app/juridico');
  revalidatePath('/app/juridico/consultas');
  revalidatePath(`/app/juridico/consultas/${entityId}`);
}

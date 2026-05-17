'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import {
  addNoteService,
  createConsultationService,
  updateConsultationStatusService,
} from '@/lib/juridico/service';
import { requireRole } from '@/lib/auth/authorization';
import { consumeIpRateLimit } from '@/lib/rate-limit';
import { formDataToRecord, firstZodError } from '@/lib/server-actions/utils';
import {
  createConsultationSchema,
  updateConsultationStatusSchema,
  addNoteSchema,
} from '@/lib/validation/schemas';

async function checkJuridicoRateLimit() {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown';
  const result = await consumeIpRateLimit(ip, 'juridico_action', {
    windowMs: 60 * 1000,
    maxRequests: 30,
  });
  if (!result.allowed) {
    throw new Error('Muitas requisições. Aguarde um momento.');
  }
}

/**
 * Cria uma nova consulta jurídica com número interno sequencial.
 * @param formData - Dados do formulário
 * @throws Error se campos obrigatórios estiverem ausentes
 */
export async function createConsultation(formData: FormData) {
  await checkJuridicoRateLimit();
  const user = await requireRole(['admin', 'diretoria', 'secretaria']);

  const raw = formDataToRecord(formData);

  const parsed = createConsultationSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(firstZodError(parsed.error.issues));
  }

  const inserted = await createConsultationService({
    ...parsed.data,
    questionFullText: parsed.data.questionFullText ?? null,
    associateId: parsed.data.associateId ?? null,
    createdBy: user.userId,
  });

  revalidatePath('/app/juridico');
  revalidatePath('/app/juridico/consultas');
  revalidateTag('legal', {});

  redirect(`/app/juridico/consultas/${inserted.id}`);
}

/**
 * Atualiza o status de uma consulta e gerencia timestamps relacionados.
 * @param id - ID da consulta
 * @param status - Novo status
 */
async function updateConsultationStatus(id: number, status: string) {
  await checkJuridicoRateLimit();
  await requireRole(['admin', 'diretoria', 'secretaria']);
  const parsed = updateConsultationStatusSchema.safeParse({ id, status });
  if (!parsed.success) {
    throw new Error(firstZodError(parsed.error.issues));
  }

  await updateConsultationStatusService(parsed.data.id, parsed.data.status);

  revalidatePath('/app/juridico');
  revalidatePath('/app/juridico/consultas');
  revalidatePath(`/app/juridico/consultas/${parsed.data.id}`);
  revalidateTag('consultation-detail', {});
  revalidateTag('legal-notes', {});
}

/**
 * Wrapper para updateConsultationStatus que recebe FormData.
 * @param formData - Dados do formulário (id, status)
 * @throws Error se ID ou status estiverem ausentes
 */
export async function updateConsultationStatusFromForm(formData: FormData) {
  const raw = formDataToRecord(formData);

  const parsed = updateConsultationStatusSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(firstZodError(parsed.error.issues));
  }

  await updateConsultationStatus(parsed.data.id, parsed.data.status);
}

/**
 * Adiciona uma nota a uma entidade e atualiza o timestamp de interação.
 * @param formData - Dados do formulário
 * @throws Error se campos obrigatórios estiverem ausentes
 */
export async function addNote(formData: FormData) {
  await checkJuridicoRateLimit();
  const user = await requireRole(['admin', 'diretoria', 'secretaria']);

  const raw = formDataToRecord(formData);

  const parsed = addNoteSchema.safeParse({
    ...raw,
    isEscritorioResponse:
      raw.isEscritorioResponse === 'true' || raw.isEscritórioResponse === 'true',
  });
  if (!parsed.success) {
    throw new Error(firstZodError(parsed.error.issues));
  }

  await addNoteService({
    ...parsed.data,
    createdBy: user.userId,
  });

  revalidatePath('/app/juridico');
  revalidatePath('/app/juridico/consultas');
  revalidatePath(`/app/juridico/consultas/${parsed.data.entityId}`);
  revalidateTag('legal-notes', {});
  revalidateTag('consultation-detail', {});
}

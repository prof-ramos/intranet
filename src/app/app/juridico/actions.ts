'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { defineFormAction } from '@/lib/server-actions/define-form-action';
import {
  addNoteService,
  createConsultationService,
  updateConsultationStatusService,
} from '@/lib/juridico/service';
import {
  createConsultationSchema,
  updateConsultationStatusSchema,
  addNoteSchema,
} from '@/lib/validation/schemas';

export const createConsultation = defineFormAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: createConsultationSchema,
  service: async (data, user) => {
    const inserted = await createConsultationService({
      ...data,
      questionFullText: data.questionFullText ?? null,
      associateId: data.associateId ?? null,
      createdBy: user.userId,
    });
    revalidatePath('/app/juridico');
    revalidatePath('/app/juridico/consultas');
    revalidateTag('legal', {});
    return inserted;
  },
  redirect: (inserted) => `/app/juridico/consultas/${inserted.id}`,
  rateLimit: { key: 'juridico_action', windowMs: 60_000, maxRequests: 30 },
});

export const updateConsultationStatusFromForm = defineFormAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: updateConsultationStatusSchema,
  service: async (data) => {
    await updateConsultationStatusService(data.id, data.status);
    revalidatePath('/app/juridico');
    revalidatePath('/app/juridico/consultas');
    revalidatePath(`/app/juridico/consultas/${data.id}`);
    revalidateTag('consultation-detail', {});
    revalidateTag('legal-notes', {});
  },
  rateLimit: { key: 'juridico_action', windowMs: 60_000, maxRequests: 30 },
});

export const addNote = defineFormAction({
  auth: ['admin', 'diretoria', 'secretaria'],
  schema: addNoteSchema,
  preprocess: (raw) => ({
    ...raw,
    isEscritorioResponse:
      raw.isEscritorioResponse === 'true' || raw.isEscritórioResponse === 'true',
  }),
  service: async (data, user) => {
    await addNoteService({
      ...data,
      createdBy: user.userId,
    });
    revalidatePath('/app/juridico');
    revalidatePath('/app/juridico/consultas');
    revalidatePath(`/app/juridico/consultas/${data.entityId}`);
    revalidateTag('legal-notes', {});
    revalidateTag('consultation-detail', {});
  },
  rateLimit: { key: 'juridico_action', windowMs: 60_000, maxRequests: 30 },
});

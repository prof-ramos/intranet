'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth/authorization';
import { consumeIpRateLimit } from '@/lib/rate-limit';
import { getTrustedClientIp } from '@/lib/ip';
import { formDataToRecord, firstZodError } from '@/lib/server-actions/utils';
import {
  updateTriageStatusSchema,
  addTriageObservacaoSchema,
  updateTriageDeadlineSchema,
} from '@/lib/validation/schemas';
import {
  updateTriageStatus,
  addTriageObservacao,
  updateTriageDeadline,
} from '@/lib/email-triage/repository';

async function checkTriageRateLimit() {
  const h = await headers();
  const ip = getTrustedClientIp(h);
  const result = await consumeIpRateLimit(ip, 'triage_action', {
    windowMs: 60 * 1000,
    maxRequests: 30,
  });
  if (!result.allowed) {
    throw new Error('Muitas requisições. Aguarde um momento.');
  }
}

export async function updateTriageStatusFromForm(formData: FormData) {
  await checkTriageRateLimit();
  const user = await requireRole(['admin']);

  const raw = formDataToRecord(formData);
  const parsed = updateTriageStatusSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(firstZodError(parsed.error.issues));
  }

  await updateTriageStatus(
    parsed.data.id,
    parsed.data.status,
    user.userId,
    parsed.data.observacoes,
  );

  revalidatePath('/app/email-triage');
  revalidatePath(`/app/email-triage/${parsed.data.id}`);
}

export async function addTriageObservacaoFromForm(formData: FormData) {
  await checkTriageRateLimit();
  const user = await requireRole(['admin']);

  const raw = formDataToRecord(formData);
  const parsed = addTriageObservacaoSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(firstZodError(parsed.error.issues));
  }

  await addTriageObservacao(parsed.data.id, parsed.data.observacoes, user.userId);

  revalidatePath('/app/email-triage');
  revalidatePath(`/app/email-triage/${parsed.data.id}`);
}

export async function updateTriageDeadlineFromForm(formData: FormData) {
  await checkTriageRateLimit();
  await requireRole(['admin']);

  const raw = formDataToRecord(formData);
  const parsed = updateTriageDeadlineSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(firstZodError(parsed.error.issues));
  }

  await updateTriageDeadline(parsed.data.id, parsed.data.prazoData, parsed.data.prazoHora);

  revalidatePath('/app/email-triage');
  revalidatePath(`/app/email-triage/${parsed.data.id}`);
}

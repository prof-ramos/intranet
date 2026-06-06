'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth/authorization';
import { consumeIpRateLimit } from '@/lib/rate-limit';
import { getTrustedClientIp } from '@/lib/ip';
import { parseFormAction } from '@/lib/server-actions/utils';
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

  const data = parseFormAction(formData, updateTriageStatusSchema);

  await updateTriageStatus(
    data.id,
    data.status,
    user.userId,
    data.observacoes,
  );

  revalidatePath('/app/email-triage');
  revalidatePath(`/app/email-triage/${data.id}`);
}

export async function addTriageObservacaoFromForm(formData: FormData) {
  await checkTriageRateLimit();
  const user = await requireRole(['admin']);

  const data = parseFormAction(formData, addTriageObservacaoSchema);

  await addTriageObservacao(data.id, data.observacoes, user.userId);

  revalidatePath('/app/email-triage');
  revalidatePath(`/app/email-triage/${data.id}`);
}

export async function updateTriageDeadlineFromForm(formData: FormData) {
  await checkTriageRateLimit();
  await requireRole(['admin']);

  const data = parseFormAction(formData, updateTriageDeadlineSchema);

  await updateTriageDeadline(data.id, data.prazoData, data.prazoHora);

  revalidatePath('/app/email-triage');
  revalidatePath(`/app/email-triage/${data.id}`);
}

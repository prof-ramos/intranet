'use server';

import { defineFormAction } from '@/lib/server-actions/define-form-action';
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

export const updateTriageStatusFromForm = defineFormAction({
  auth: ['admin'],
  schema: updateTriageStatusSchema,
  service: async (data, user) => {
    await updateTriageStatus(data.id, data.status, user.userId, data.observacoes);
  },
  revalidate: {
    path: ['/app/email-triage'],
  },
  rateLimit: { key: 'triage_action', windowMs: 60_000, maxRequests: 30 },
});

export const addTriageObservacaoFromForm = defineFormAction({
  auth: ['admin'],
  schema: addTriageObservacaoSchema,
  service: async (data, user) => {
    await addTriageObservacao(data.id, data.observacoes, user.userId);
  },
  revalidate: {
    path: ['/app/email-triage'],
  },
  rateLimit: { key: 'triage_action', windowMs: 60_000, maxRequests: 30 },
});

export const updateTriageDeadlineFromForm = defineFormAction({
  auth: ['admin'],
  schema: updateTriageDeadlineSchema,
  service: async (data) => {
    await updateTriageDeadline(data.id, data.prazoData, data.prazoHora);
  },
  revalidate: {
    path: ['/app/email-triage'],
  },
  rateLimit: { key: 'triage_action', windowMs: 60_000, maxRequests: 30 },
});

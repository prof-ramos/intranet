'use server';

import { z } from 'zod';
import { defineServerAction } from '@/lib/server-actions/define-form-action';
import {
  cancelMailingCampaign,
  createMailingCampaign,
  MAILING_MANUAL_BATCH,
  previewMailingAudience,
  processMailingBatch,
  startMailingCampaign,
  type MailingPreviewResult,
} from '@/lib/mailing';

const ALLOWED_ROLES = ['admin', 'diretoria', 'secretaria'] as const;

export const previewMailingAudienceAction = defineServerAction({
  auth: ALLOWED_ROLES,
  schema: z.object({
    channel: z.enum(['email', 'etiquetas']),
    filters: z
      .object({
        associationStatus: z.enum(['associado', 'nao_associado']).optional(),
        functionalStatus: z.enum(['ativo', 'aposentado', 'cedido', 'em_licenca']).optional(),
        contributionStatus: z.enum(['em_dia', 'inadimplente']).optional(),
        location: z.enum(['brasil', 'exterior']).optional(),
      })
      .strict(),
  }),
  service: async (input): Promise<MailingPreviewResult> =>
    previewMailingAudience(input.channel, input.filters),
});

export const createMailingCampaignAction = defineServerAction({
  auth: ALLOWED_ROLES,
  schema: z.object({
    name: z.string().trim().min(3).max(120),
    channel: z.enum(['email', 'etiquetas']),
    subject: z.string().trim().max(180).optional().or(z.literal('')),
    templateBody: z.string().trim().min(1).max(20_000),
    filters: z
      .object({
        associationStatus: z.enum(['associado', 'nao_associado']).optional(),
        functionalStatus: z.enum(['ativo', 'aposentado', 'cedido', 'em_licenca']).optional(),
        contributionStatus: z.enum(['em_dia', 'inadimplente']).optional(),
        location: z.enum(['brasil', 'exterior']).optional(),
      })
      .strict(),
  }),
  service: async (input, user) =>
    createMailingCampaign(
      {
        ...input,
        subject: input.subject ?? undefined,
      },
      user.userId,
    ),
  revalidate: '/app/mala-direta',
  redirect: (output) => `/app/mala-direta/${output.id}`,
});

export const startMailingCampaignAction = defineServerAction({
  auth: ALLOWED_ROLES,
  schema: z.object({ campaignId: z.number().int().positive() }),
  service: async (input, user) => {
    await startMailingCampaign(input.campaignId, user.userId);
    return processMailingBatch(MAILING_MANUAL_BATCH);
  },
  revalidate: '/app/mala-direta',
});

export const processMailingBatchAction = defineServerAction({
  auth: ALLOWED_ROLES,
  schema: z.object({ campaignId: z.number().int().positive() }),
  service: async () => processMailingBatch(MAILING_MANUAL_BATCH),
  revalidate: '/app/mala-direta',
});

export const cancelMailingCampaignAction = defineServerAction({
  auth: ALLOWED_ROLES,
  schema: z.object({ campaignId: z.number().int().positive() }),
  service: async (input, user) => cancelMailingCampaign(input.campaignId, user.userId),
  revalidate: '/app/mala-direta',
});

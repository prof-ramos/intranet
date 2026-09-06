import { z } from 'zod';
import { mailingChannel } from '@/lib/db/schema';
import { MAILING_MAX_RECIPIENTS } from './types';

const optionalTrimmedFilter = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => (value ? value : undefined));

export const mailingAudienceFiltersSchema = z
  .object({
    associationStatus: z.enum(['associado', 'nao_associado']).optional(),
    functionalStatus: z.enum(['ativo', 'aposentado', 'cedido', 'em_licenca']).optional(),
    contributionStatus: z.enum(['em_dia', 'inadimplente']).optional(),
    location: z.enum(['brasil', 'exterior']).optional(),
    associationCategory: optionalTrimmedFilter,
    assignment: optionalTrimmedFilter,
  })
  .strict();

export type MailingAudienceFiltersInput = z.input<typeof mailingAudienceFiltersSchema>;
export type MailingAudienceFiltersOutput = z.output<typeof mailingAudienceFiltersSchema>;

export const createMailingCampaignSchema = z
  .object({
    name: z.string().trim().min(3, 'Informe um nome para a campanha.').max(120),
    channel: z.enum(mailingChannel.enumValues),
    subject: z.string().trim().max(180).optional().or(z.literal('')),
    templateBody: z.string().trim().min(1, 'Informe o corpo da mensagem.').max(20_000),
    filters: mailingAudienceFiltersSchema,
  })
  .superRefine((data, ctx) => {
    if (data.channel === 'email' && !data.subject) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['subject'],
        message: 'Informe o assunto do e-mail.',
      });
    }
  });

export type CreateMailingCampaignInput = z.input<typeof createMailingCampaignSchema>;
export type CreateMailingCampaignOutput = z.output<typeof createMailingCampaignSchema>;

export const previewMailingAudienceSchema = z.object({
  channel: z.enum(mailingChannel.enumValues),
  filters: mailingAudienceFiltersSchema,
});

export const MAX_RECIPIENTS_MESSAGE = `O público selecionado excede o limite de ${MAILING_MAX_RECIPIENTS} destinatários por campanha.`;

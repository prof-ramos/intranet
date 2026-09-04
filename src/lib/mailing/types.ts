export const MAILING_CHANNELS = ['email', 'etiquetas'] as const;
export type MailingChannel = (typeof MAILING_CHANNELS)[number];

export const MAILING_CAMPAIGN_STATUSES = [
  'rascunho',
  'em_envio',
  'concluida',
  'falhou',
  'cancelada',
] as const;
export type MailingCampaignStatus = (typeof MAILING_CAMPAIGN_STATUSES)[number];

export const MAILING_RECIPIENT_STATUSES = ['pendente', 'enviado', 'falhou', 'cancelado'] as const;
export type MailingRecipientStatus = (typeof MAILING_RECIPIENT_STATUSES)[number];

export interface MailingAudienceFilters {
  associationStatus?: 'associado' | 'nao_associado';
  functionalStatus?: 'ativo' | 'aposentado' | 'cedido' | 'em_licenca';
  contributionStatus?: 'em_dia' | 'inadimplente';
  location?: 'brasil' | 'exterior';
}

export interface MailingAudienceMember {
  associateId: number;
  name: string;
  email: string | null;
}

export interface MailingCampaignHistoryRow {
  id: number;
  name: string;
  channel: MailingChannel;
  status: MailingCampaignStatus;
  subject: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdByName: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface MailingCampaignDetail extends MailingCampaignHistoryRow {
  templateBody: string;
  filters: Record<string, unknown>;
  channel: MailingChannel;
  recipientTotals: {
    pendente: number;
    enviado: number;
    falhou: number;
    cancelado: number;
  };
}

export const MAILING_MAX_RECIPIENTS = 2000;
export const MAILING_MAX_ATTEMPTS = 3;

import type { MailingAudienceFilters } from './types';

const ASSOCIATION_LABEL: Record<string, string> = {
  associado: 'Associado',
  nao_associado: 'Não associado',
};

const FUNCTIONAL_LABEL: Record<string, string> = {
  ativo: 'Ativo',
  aposentado: 'Aposentado',
  cedido: 'Cedido',
  em_licenca: 'Em licença',
};

const CONTRIBUTION_LABEL: Record<string, string> = {
  em_dia: 'Em dia',
  inadimplente: 'Inadimplente',
};

const LOCATION_LABEL: Record<string, string> = {
  brasil: 'Brasil',
  exterior: 'Exterior',
};

export function describeMailingFilters(filters: unknown): { label: string; value: string }[] {
  const parsed = (filters ?? {}) as MailingAudienceFilters;
  const rows: { label: string; value: string }[] = [];
  if (parsed.associationStatus) {
    rows.push({
      label: 'Vínculo ASOF',
      value: ASSOCIATION_LABEL[parsed.associationStatus] ?? parsed.associationStatus,
    });
  }
  if (parsed.functionalStatus) {
    rows.push({
      label: 'Situação funcional',
      value: FUNCTIONAL_LABEL[parsed.functionalStatus] ?? parsed.functionalStatus,
    });
  }
  if (parsed.contributionStatus) {
    rows.push({
      label: 'Contribuição',
      value: CONTRIBUTION_LABEL[parsed.contributionStatus] ?? parsed.contributionStatus,
    });
  }
  if (parsed.location) {
    rows.push({
      label: 'Localização',
      value: LOCATION_LABEL[parsed.location] ?? parsed.location,
    });
  }
  if (parsed.associationCategory) {
    rows.push({
      label: 'Categoria',
      value: parsed.associationCategory,
    });
  }
  if (parsed.assignment) {
    rows.push({
      label: 'Lotação',
      value: parsed.assignment,
    });
  }
  return rows;
}

export const MAILING_RECIPIENT_STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  enviando: 'Enviando',
  enviado: 'Enviado',
  falhou: 'Falhou',
  cancelado: 'Cancelado',
};

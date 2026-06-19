import type { ReportAssociate } from './queries';
import { ASSOCIATE_EXPORT_FIELDS } from '@/lib/associates/lgpd';

export interface FieldDef {
  key: string;
  label: string;
  sensitivity: 'sensitive' | 'public';
  get: (r: ReportAssociate) => string | null | undefined;
}

// Enum label maps for human-readable CSV output
const sexLabels: Record<string, string> = {
  masculino: 'Masculino',
  feminino: 'Feminino',
  outro: 'Outro',
};

const maritalStatusLabels: Record<string, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
  separado: 'Separado(a)',
  uniao_estavel: 'União Estável',
};

const missionTypeLabels: Record<string, string> = {
  permanente: 'Permanente',
  transitoria: 'Transitória',
};

const careerOriginLabels: Record<string, string> = {
  brasil: 'Brasil',
  exterior: 'Exterior',
  outros_orgaos: 'Outros Órgãos',
};

const paymentMethodLabels: Record<string, string> = {
  folha: 'Folha',
  boleto: 'Boleto',
  pix: 'PIX',
  transferencia: 'Transferência',
  outros: 'Outros',
};

const functionalStatusLabels: Record<string, string> = {
  ativo: 'Ativo',
  aposentado: 'Aposentado',
  cedido: 'Cedido',
  em_licenca: 'Em Licença',
};

const associationStatusLabels: Record<string, string> = {
  associado: 'Associado',
  nao_associado: 'Não associado',
};

const contributionStatusLabels: Record<string, string> = {
  em_dia: 'Em Dia',
  inadimplente: 'Inadimplente',
};

function formatEnum(value: string | null | undefined, labels: Record<string, string>): string | null {
  if (!value) return null;
  return labels[value] ?? value;
}

function formatBoolean(value: boolean | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value ? 'Sim' : 'Não';
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  // Handle both ISO dates and date-only strings
  const date = new Date(value + (value.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const ALL_FIELDS: FieldDef[] = ASSOCIATE_EXPORT_FIELDS.map((f) => {
  // Custom getters for fields that need formatting
  const formatters: Partial<Record<string, (r: ReportAssociate) => string | null | undefined>> = {
    sex: (r) => formatEnum(r.sex, sexLabels),
    maritalStatus: (r) => formatEnum(r.maritalStatus, maritalStatusLabels),
    birthDate: (r) => formatDate(r.birthDate),
    rgExpeditionDate: (r) => formatDate(r.rgExpeditionDate),
    assignmentStartDate: (r) => formatDate(r.assignmentStartDate),
    joinedAt: (r) => formatDate(r.joinedAt),
    admissionDate: (r) => formatDate(r.admissionDate),
    inaugurationDate: (r) => formatDate(r.inaugurationDate),
    retirementDate: (r) => formatDate(r.retirementDate),
    cancellationDate: (r) => formatDate(r.cancellationDate),
    functionalStatus: (r) => formatEnum(r.functionalStatus, functionalStatusLabels),
    associationStatus: (r) => formatEnum(r.associationStatus, associationStatusLabels),
    contributionStatus: (r) => formatEnum(r.contributionStatus, contributionStatusLabels),
    missionType: (r) => formatEnum(r.missionType, missionTypeLabels),
    careerOrigin: (r) => formatEnum(r.careerOrigin, careerOriginLabels),
    paymentMethod: (r) => formatEnum(r.paymentMethod, paymentMethodLabels),
    ceocMember: (r) => formatBoolean(r.ceocMember),
    caocMember: (r) => formatBoolean(r.caocMember),
  };

  return {
    key: f.key,
    label: f.label,
    sensitivity: f.sensitivity,
    get: formatters[f.key] ?? ((r: ReportAssociate) => r[f.key as keyof ReportAssociate] as string | null | undefined),
  };
});

export function toCsvCell(value: string | null | undefined): string {
  const str = value == null ? '' : value;
  const escaped = str.replace(/"/g, '""');
  // Prevent CSV/formula injection by prefixing dangerous characters with a tab
  if (/^[-=+@\t\r]/.test(escaped)) {
    return `"\t${escaped}"`;
  }
  return `"${escaped}"`;
}

export function generateCsv(rows: ReportAssociate[], selectedKeys: string[]): string {
  const selectedFields =
    selectedKeys.length > 0 ? ALL_FIELDS.filter((f) => selectedKeys.includes(f.key)) : ALL_FIELDS;

  const headerRow = selectedFields.map((f) => toCsvCell(f.label)).join(',');
  const dataRows = rows.map((row) => selectedFields.map((f) => toCsvCell(f.get(row))).join(','));

  // BOM prefix ensures Excel opens UTF-8 correctly
  return '﻿' + [headerRow, ...dataRows].join('\r\n');
}

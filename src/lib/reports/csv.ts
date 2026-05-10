import type { ReportAssociate } from './queries';

export interface FieldDef {
  key: string;
  label: string;
  get: (r: ReportAssociate) => string | null | undefined;
}

export const ALL_FIELDS: FieldDef[] = [
  { key: 'fullName', label: 'Nome', get: (r) => r.fullName },
  { key: 'primaryEmail', label: 'E-mail', get: (r) => r.primaryEmail },
  { key: 'secondaryEmail', label: 'E-mail Secundário', get: (r) => r.secondaryEmail },
  { key: 'birthDate', label: 'Data de Nascimento', get: (r) => r.birthDate },
  { key: 'cpf', label: 'CPF', get: (r) => r.cpf },
  { key: 'address', label: 'Endereço', get: (r) => r.address },
  { key: 'locationCity', label: 'Cidade', get: (r) => r.locationCity },
  { key: 'locationCountry', label: 'País', get: (r) => r.locationCountry },
  { key: 'phone', label: 'Telefone', get: (r) => r.phone },
  { key: 'whatsapp', label: 'Celular/WhatsApp', get: (r) => r.whatsapp },
  { key: 'siape', label: 'Matrícula SIAPE', get: (r) => r.siape },
  { key: 'assignment', label: 'Lotação', get: (r) => r.assignment },
  { key: 'assignmentStartDate', label: 'Data da Lotação', get: (r) => r.assignmentStartDate },
  { key: 'classPattern', label: 'Classe e Padrão', get: (r) => r.classPattern },
  { key: 'functionalStatus', label: 'Situação Funcional', get: (r) => r.functionalStatus },
  { key: 'associationStatus', label: 'Situação Associativa', get: (r) => r.associationStatus },
  { key: 'contributionStatus', label: 'Contribuição', get: (r) => r.contributionStatus },
  { key: 'joinedAt', label: 'Data de Adesão', get: (r) => r.joinedAt },
  { key: 'associationCategory', label: 'Categoria', get: (r) => r.associationCategory },
];

export function toCsvCell(value: string | null | undefined): string {
  const str = value == null ? '' : value;
  const escaped = str.replace(/"/g, '""');
  // Prevent CSV/formula injection by prefixing dangerous characters with a tab
  if (/^[-=+@\t]/.test(escaped)) {
    return `"\t${escaped}"`;
  }
  return `"${escaped}"`;
}

export function generateCsv(rows: ReportAssociate[], selectedKeys: string[]): string {
  const selectedFields =
    selectedKeys.length > 0
      ? ALL_FIELDS.filter((f) => selectedKeys.includes(f.key))
      : ALL_FIELDS;

  const headerRow = selectedFields.map((f) => toCsvCell(f.label)).join(',');
  const dataRows = rows.map((row) =>
    selectedFields.map((f) => toCsvCell(f.get(row))).join(','),
  );

  // BOM prefix ensures Excel opens UTF-8 correctly
  return '﻿' + [headerRow, ...dataRows].join('\r\n');
}

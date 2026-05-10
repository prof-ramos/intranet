import type { ReportAssociate } from './queries';
import { ASSOCIATE_EXPORT_FIELDS } from '@/lib/lgpd/dtos';

export interface FieldDef {
  key: string;
  label: string;
  sensitivity: 'sensitive' | 'public';
  get: (r: ReportAssociate) => string | null | undefined;
}

export const ALL_FIELDS: FieldDef[] = ASSOCIATE_EXPORT_FIELDS.map((f) => ({
  key: f.key,
  label: f.label,
  sensitivity: f.sensitivity,
  get: (r: ReportAssociate) => r[f.key as keyof ReportAssociate] as string | null | undefined,
}));

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

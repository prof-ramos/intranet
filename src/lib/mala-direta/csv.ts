import { toCsvCell } from '@/lib/reports/csv';
import { GMAIL_CONTACTS_HEADERS, type GmailContactRow } from './types';

export function generateGmailContactsCsv(rows: GmailContactRow[]): string {
  const headerRow = GMAIL_CONTACTS_HEADERS.map((header) => toCsvCell(header)).join(',');
  const dataRows = rows.map((row) =>
    [row.name, row.firstName, row.lastName, row.email].map((value) => toCsvCell(value)).join(','),
  );

  // BOM + CRLF — same convention as reports/csv so Excel/Gmail open UTF-8 correctly.
  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
}

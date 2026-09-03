import { logAuditAction, logDataAccess } from '@/lib/audit/service';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';
import { generateGmailContactsCsv } from './csv';
import { getMalaDiretaContacts } from './queries';
import type { MalaDiretaFilters } from './types';

const logger = createLogger('mala-direta');

export interface MalaDiretaExportResult {
  csv: string;
  rowCount: number;
}

async function auditBestEffort(logKind: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    logger.warn(`[mala-direta] failed to persist ${logKind}`, { error: toSafeErrorLog(error) });
  }
}

export async function exportGmailContactsCsv(
  userId: number,
  filters: MalaDiretaFilters,
): Promise<MalaDiretaExportResult> {
  const contacts = await getMalaDiretaContacts(filters);
  const csv = generateGmailContactsCsv(contacts);

  await auditBestEffort('data access log', () =>
    logDataAccess({
      adminId: userId,
      action: 'export',
      entityType: 'associate',
      entityId: null,
      metadata: {
        format: 'gmail_contacts_csv',
        filters: Object.keys(filters),
        associationStatus: filters.associationStatus ?? null,
        functionalStatus: filters.functionalStatus ?? null,
        location: filters.location ?? null,
        rowCount: contacts.length,
      },
    }),
  );

  await auditBestEffort('audit log', () =>
    logAuditAction({
      adminId: userId,
      action: 'mala_direta_gmail_contacts_export',
      entityType: 'associate',
      entityId: null,
      metadata: {
        format: 'csv',
        filters: Object.keys(filters),
        rowCount: contacts.length,
      },
    }),
  );

  return { csv, rowCount: contacts.length };
}

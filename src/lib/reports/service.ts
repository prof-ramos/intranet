import { getAssociatesForReport, REPORT_DEFAULT_LIMIT } from './queries';
import { generateCsv } from './csv';
import { auditReportDownload } from './audit';
import { logDataAccess } from '@/lib/audit/service';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';
import type { ReportFilters } from './export-filters';

const logger = createLogger('reports');

export interface ReportResult {
  csv: string;
  rowCount: number;
}

async function auditBestEffort(logKind: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    logger.warn(`[report-service] failed to persist ${logKind}`, { error: toSafeErrorLog(error) });
  }
}

export async function generateReport(
  userId: number,
  filters: ReportFilters,
  selectedKeys: string[],
): Promise<ReportResult> {
  const rows = await getAssociatesForReport(filters, REPORT_DEFAULT_LIMIT, selectedKeys);
  const csv = generateCsv(rows, selectedKeys);

  await Promise.all([
    auditBestEffort('audit log', () =>
      auditReportDownload(userId, filters, selectedKeys, rows.length),
    ),
    auditBestEffort('data access log', () =>
      logDataAccess({
        adminId: userId,
        action: 'export',
        entityType: 'associate',
        entityId: null,
        metadata: { format: 'csv', fieldCount: selectedKeys.length, rowCount: rows.length },
      }),
    ),
  ]);

  return { csv, rowCount: rows.length };
}

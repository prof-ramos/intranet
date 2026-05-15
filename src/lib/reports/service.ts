import { getAssociatesForReport } from './queries';
import { generateCsv } from './csv';
import { auditReportDownload } from './audit';
import { logDataAccess } from '@/lib/audit/service';
import type { ReportFilters } from './export-filters';

export interface ReportResult {
  csv: string;
  rowCount: number;
}

export async function generateReport(
  userId: number,
  filters: ReportFilters,
  selectedKeys: string[],
): Promise<ReportResult> {
  const rows = await getAssociatesForReport(filters);
  const csv = generateCsv(rows, selectedKeys);

  try {
    await auditReportDownload(userId, filters, selectedKeys, rows.length);
  } catch (error) {
    console.warn('[report-service] failed to persist audit log', { error });
  }

  try {
    await logDataAccess({
      adminId: userId,
      action: 'export',
      entityType: 'associate',
      entityId: null,
      metadata: { format: 'csv', fieldCount: selectedKeys.length, rowCount: rows.length },
    });
  } catch (error) {
    console.warn('[report-service] failed to persist data access log', { error });
  }

  return { csv, rowCount: rows.length };
}
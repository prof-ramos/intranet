import { auditLogs } from '@/lib/db/schema';
import type { ReportFilters } from '@/lib/reports/export-filters';

export async function auditReportDownload(
  userId: number,
  filters: ReportFilters,
  selectedKeys: string[],
  rowCount: number,
) {
  // Importacao tardia evita inicializacao do DB durante o build do Next.js.
  const { db } = await import('@/lib/db');

  await db.insert(auditLogs).values({
    action: 'report_download',
    entityType: 'associate',
    entityId: null,
    performedBy: userId,
    changes: null,
    metadata: {
      format: 'csv',
      filters: Object.keys(filters),
      fields: selectedKeys,
      rowCount,
    },
  });
}

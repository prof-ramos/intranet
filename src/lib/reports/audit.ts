import type { ReportFilters } from '@/lib/reports/export-filters';

export async function auditReportDownload(
  userId: number,
  filters: ReportFilters,
  selectedKeys: string[],
  rowCount: number,
) {
  // Importacao tardia evita inicializacao do DB durante o build do Next.js.
  const { logAuditAction } = await import('@/lib/audit/service');

  await logAuditAction({
    adminId: userId,
    action: 'report_download',
    entityType: 'associate',
    entityId: null,
    metadata: {
      format: 'csv',
      filters: Object.keys(filters),
      fields: selectedKeys,
      rowCount,
    },
  });
}

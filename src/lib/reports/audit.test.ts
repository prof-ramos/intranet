import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditReportDownload } from './audit';
import type { ReportFilters } from '@/lib/reports/export-filters';

const { logAuditActionMock } = vi.hoisted(() => ({
  logAuditActionMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/audit/service', () => ({
  logAuditAction: (...args: unknown[]) => logAuditActionMock(...args),
}));

describe('auditReportDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logAuditActionMock.mockResolvedValue(undefined);
  });

  it('logs an audit action for report download', async () => {
    const filters = { status: 'active', type: 'associate' };
    const selectedKeys = ['id', 'name'];

    await auditReportDownload(123, filters as unknown as ReportFilters, selectedKeys, 100);

    expect(logAuditActionMock).toHaveBeenCalledWith({
      adminId: 123,
      action: 'report_download',
      entityType: 'associate',
      entityId: null,
      metadata: {
        format: 'csv',
        filters: ['status', 'type'],
        fields: ['id', 'name'],
        rowCount: 100,
      },
    });
  });

  it('handles empty filters gracefully', async () => {
    const filters = {};
    const selectedKeys = ['id'];

    await auditReportDownload(456, filters as unknown as ReportFilters, selectedKeys, 0);

    expect(logAuditActionMock).toHaveBeenCalledWith({
      adminId: 456,
      action: 'report_download',
      entityType: 'associate',
      entityId: null,
      metadata: {
        format: 'csv',
        filters: [],
        fields: ['id'],
        rowCount: 0,
      },
    });
  });
});

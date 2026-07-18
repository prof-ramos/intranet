import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditReportDownload } from './audit';
import { auditLogs } from '@/lib/db/schema';
import type { ReportFilters } from '@/lib/reports/export-filters';

const { insertMock, valuesMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
  valuesMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: (...args: unknown[]) => {
      insertMock(...args);
      return {
        values: valuesMock,
      };
    },
  },
}));

describe('auditReportDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    valuesMock.mockResolvedValue([{ id: 1 }]);
  });

  it('should insert an audit log for report download', async () => {
    const filters = { status: 'active', type: 'associate' };
    const selectedKeys = ['id', 'name'];

    await auditReportDownload(123, filters as unknown as ReportFilters, selectedKeys, 100);

    expect(insertMock).toHaveBeenCalledWith(auditLogs);
    expect(valuesMock).toHaveBeenCalledWith({
      action: 'report_download',
      entityType: 'associate',
      entityId: null,
      performedBy: 123,
      changes: null,
      metadata: {
        format: 'csv',
        filters: ['status', 'type'],
        fields: ['id', 'name'],
        rowCount: 100,
      },
    });
  });

  it('should handle empty filters gracefully', async () => {
    const filters = {};
    const selectedKeys = ['id'];

    await auditReportDownload(456, filters as unknown as ReportFilters, selectedKeys, 0);

    expect(insertMock).toHaveBeenCalledWith(auditLogs);
    expect(valuesMock).toHaveBeenCalledWith({
      action: 'report_download',
      entityType: 'associate',
      entityId: null,
      performedBy: 456,
      changes: null,
      metadata: {
        format: 'csv',
        filters: [],
        fields: ['id'],
        rowCount: 0,
      },
    });
  });
});

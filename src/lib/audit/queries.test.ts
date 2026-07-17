import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAssociateAuditHistory } from './queries';
import { auditLogs } from '@/lib/db/schema/audit';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

// Create the mock setup
const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: mockSelect,
  },
}));

function makeSelectChain(rows: unknown[]) {
  const limitMock = vi.fn().mockResolvedValue(rows);
  const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
  const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
  const fromMock = vi.fn().mockReturnValue({ where: whereMock });
  return {
    from: fromMock,
    _limitMock: limitMock,
    _orderByMock: orderByMock,
    _whereMock: whereMock,
  };
}

function compileSql(fragment: SQL) {
  return new PgDialect().sqlToQuery(fragment);
}

describe('getAssociateAuditHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retrieves audit history and maps results correctly', async () => {
    const mockDate = new Date('2026-07-16T12:00:00Z');
    const mockRows = [
      {
        action: 'data_view',
        changes: null,
        metadata: { page: 'profile' },
        createdAt: mockDate,
      },
      {
        action: 'update',
        changes: { old: { name: 'Old' }, new: { name: 'New' } },
        metadata: null,
        createdAt: mockDate,
      },
    ];

    const chain = makeSelectChain(mockRows);
    mockSelect.mockReturnValue(chain);

    const result = await getAssociateAuditHistory(42);

    expect(mockSelect).toHaveBeenCalledWith({
      action: auditLogs.action,
      changes: auditLogs.changes,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    });

    // Default limit is 20
    expect(chain._limitMock).toHaveBeenCalledWith(20);

    const where = compileSql(chain._whereMock.mock.calls[0][0] as SQL);
    expect(where.sql).toContain('"entity_type" = $1');
    expect(where.sql).toContain('"entity_id" = $2');
    expect(where.params).toEqual(['associate', 42]);

    const orderBy = compileSql(chain._orderByMock.mock.calls[0][0] as SQL);
    expect(orderBy.sql).toContain('"created_at" desc');

    expect(result).toEqual([
      {
        action: 'data_view',
        changes: null,
        metadata: { page: 'profile' },
        createdAt: mockDate,
      },
      {
        action: 'update',
        changes: { old: { name: 'Old' }, new: { name: 'New' } },
        metadata: null,
        createdAt: mockDate,
      },
    ]);
  });

  it('uses custom limit when provided', async () => {
    const chain = makeSelectChain([]);
    mockSelect.mockReturnValue(chain);

    await getAssociateAuditHistory(42, 5);

    expect(chain._limitMock).toHaveBeenCalledWith(5);
  });

  it('returns empty array when no history found', async () => {
    const chain = makeSelectChain([]);
    mockSelect.mockReturnValue(chain);

    const result = await getAssociateAuditHistory(100);

    expect(result).toEqual([]);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkAndEmitLgpdRetentionActivities } from './retention';

const mocks = vi.hoisted(() => {
  const schema = {
    activities: Symbol('activities'),
    admins: {
      id: Symbol('admins.id'),
      isActive: Symbol('admins.isActive'),
    },
    associates: {
      id: Symbol('associates.id'),
      associationStatus: Symbol('associates.associationStatus'),
      cancellationDate: Symbol('associates.cancellationDate'),
    },
    auditLogs: Symbol('auditLogs'),
  };

  return {
    schema,
    tx: {
      select: vi.fn(),
      insert: vi.fn(),
    },
    transaction: vi.fn(),
    activityValues: vi.fn(),
    activityReturning: vi.fn(),
    auditValues: vi.fn(),
    adminLimit: vi.fn(),
    expiredLimit: vi.fn(),
  };
});

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => ({ op: 'and', args })),
  eq: vi.fn((...args: unknown[]) => ({ op: 'eq', args })),
  isNotNull: vi.fn((...args: unknown[]) => ({ op: 'isNotNull', args })),
  lte: vi.fn((...args: unknown[]) => ({ op: 'lte', args })),
  notExists: vi.fn((query: unknown) => ({ op: 'notExists', query })),
  like: vi.fn((...args: unknown[]) => ({ op: 'like', args })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    transaction: mocks.transaction,
  },
}));

vi.mock('@/lib/db/schema', () => mocks.schema);

function configureQueryBuilders() {
  const adminOrderBy = vi.fn(() => ({ limit: mocks.adminLimit }));
  const adminWhere = vi.fn(() => ({ orderBy: adminOrderBy }));
  const adminFrom = vi.fn(() => ({ where: adminWhere }));

  const expiredWhere = vi.fn(() => ({ limit: mocks.expiredLimit }));
  const expiredFrom = vi.fn(() => ({ where: expiredWhere }));

  const existingActivityWhere = vi.fn(() => ({}));
  const existingActivityFrom = vi.fn(() => ({ where: existingActivityWhere }));

  mocks.tx.select
    .mockReturnValueOnce({ from: adminFrom })
    .mockReturnValueOnce({ from: expiredFrom })
    .mockReturnValueOnce({ from: existingActivityFrom });
}

describe('checkAndEmitLgpdRetentionActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.transaction.mockImplementation(
      async (callback: (tx: typeof mocks.tx) => Promise<unknown>) => callback(mocks.tx),
    );
    mocks.tx.insert.mockImplementation((table: unknown) => {
      if (table === mocks.schema.activities) {
        return {
          values: mocks.activityValues.mockReturnValue({
            returning: mocks.activityReturning,
          }),
        };
      }

      return {
        values: mocks.auditValues,
      };
    });

    mocks.adminLimit.mockResolvedValue([{ id: 7 }]);
    mocks.expiredLimit.mockResolvedValue([]);
    mocks.activityReturning.mockResolvedValue([]);
    configureQueryBuilders();
  });

  it('creates PII-free review activities and a sanitized audit log for expired former associates', async () => {
    mocks.expiredLimit.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    mocks.activityReturning.mockResolvedValue([{ id: 100 }, { id: 101 }]);

    const result = await checkAndEmitLgpdRetentionActivities({
      limit: 500,
      now: new Date('2026-05-29T12:00:00.000Z'),
    });

    expect(result).toEqual({ createdCount: 2 });
    expect(mocks.activityValues).toHaveBeenCalledWith([
      expect.objectContaining({
        title: 'Revisar Retenção LGPD (Prazo Expirado) - Oficial ID 10',
        associateId: 10,
        createdBy: 7,
        priority: 'alta',
        tags: ['LGPD', 'Retenção'],
        dueDate: '2026-06-13T12:00:00.000Z',
      }),
      expect.objectContaining({
        title: 'Revisar Retenção LGPD (Prazo Expirado) - Oficial ID 11',
        associateId: 11,
      }),
    ]);
    expect(mocks.expiredLimit).toHaveBeenCalledWith(100);
    expect(mocks.auditValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'lgpd_retention_scan',
        entityType: 'activity',
        performedBy: 7,
        metadata: expect.objectContaining({
          actorType: 'system',
          retentionYears: 5,
          reviewSlaDays: 15,
          limit: 100,
          candidatesFound: 2,
          activitiesCreated: 2,
          activityIds: [100, 101],
        }),
      }),
    );
    expect(JSON.stringify(mocks.activityValues.mock.calls[0][0])).not.toMatch(
      /cpf|siape|email|telefone|whatsapp|address/i,
    );
    expect(JSON.stringify(mocks.auditValues.mock.calls[0][0])).not.toMatch(
      /cpf|siape|email|telefone|whatsapp|address/i,
    );
  });

  it('audits scans even when no expired associates are found', async () => {
    const result = await checkAndEmitLgpdRetentionActivities({
      limit: 25,
      now: new Date('2026-05-29T12:00:00.000Z'),
    });

    expect(result).toEqual({ createdCount: 0 });
    expect(mocks.activityValues).not.toHaveBeenCalled();
    expect(mocks.auditValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'lgpd_retention_scan',
        metadata: expect.objectContaining({
          limit: 25,
          candidatesFound: 0,
          activitiesCreated: 0,
          retentionCutoff: '2021-05-29T12:00:00.000Z',
        }),
      }),
    );
  });

  it('fails before writing when no active admin can own review activities', async () => {
    mocks.adminLimit.mockResolvedValue([]);

    await expect(
      checkAndEmitLgpdRetentionActivities({
        limit: 25,
        now: new Date('2026-05-29T12:00:00.000Z'),
      }),
    ).rejects.toThrow('No active admin found to create LGPD activities');

    expect(mocks.activityValues).not.toHaveBeenCalled();
    expect(mocks.auditValues).not.toHaveBeenCalled();
  });
});

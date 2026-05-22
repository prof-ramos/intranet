import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getFailedEvents, cleanUpOldDeliveries } from '@/lib/integrations/webhooks/repository';

// Mock the Drizzle schema imports so we can control the table references
vi.mock('@/lib/db/schema/integrations', () => ({
  domainEvents: {
    id: 'id',
    deliveryStatus: 'delivery_status',
    occurredAt: 'occurred_at',
  },
  webhookDeliveries: {
    id: 'id',
    status: 'status',
    createdAt: 'created_at',
  },
  webhookSubscriptions: {},
}));

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

// Drizzle operators mock — these are pure functions, no need to mock
vi.mock('drizzle-orm', () => ({
  and: (...conditions: unknown[]) => ({ type: 'and', conditions }),
  desc: (col: string) => ({ type: 'desc', col }),
  eq: (col: unknown, val: unknown) => ({ type: 'eq', col, val }),
  lt: (col: unknown, val: unknown) => ({ type: 'lt', col, val }),
  inArray: () => ({}),
  asc: () => ({}),
  sql: {} as never,
}));

describe('getFailedEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Chain: db.select().from(domainEvents).where(eq(...)).orderBy(desc(...)).limit(n)
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([
      { id: 1, eventType: 'associate.updated', deliveryStatus: 'failed' },
      { id: 5, eventType: 'legal_consultation.created', deliveryStatus: 'failed' },
    ]);
  });

  it('queries domain events with delivery_status = failed', async () => {
    const result = await getFailedEvents(50);

    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it('limits results to the provided limit', async () => {
    await getFailedEvents(10);

    expect(mockOrderBy).toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it('defaults limit to 50', async () => {
    await getFailedEvents();

    expect(mockLimit).toHaveBeenCalledWith(50);
  });

  it('throws for invalid limit values', async () => {
    await expect(getFailedEvents(0)).rejects.toThrow('limit must be an integer');
    await expect(getFailedEvents(1.5)).rejects.toThrow('limit must be an integer');
    await expect(getFailedEvents(1001)).rejects.toThrow('limit must be an integer');
  });
});

describe('cleanUpOldDeliveries', () => {
  const mockReturning = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Chain: db.delete(webhookDeliveries).where(and(...)).returning(...)
    mockDelete.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ returning: mockReturning });
  });

  it('deletes delivered records older than retention period', async () => {
    mockReturning.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);

    const deleted = await cleanUpOldDeliveries(30);

    expect(deleted).toBe(3);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(mockReturning).toHaveBeenCalledWith({ id: 'id' });
  });

  it('defaults retention to 30 days', async () => {
    mockReturning.mockResolvedValue([]);

    await cleanUpOldDeliveries();

    expect(mockWhere).toHaveBeenCalled();
  });

  it('accepts custom retention days', async () => {
    mockReturning.mockResolvedValue([{ id: 10 }]);

    const deleted = await cleanUpOldDeliveries(60);

    expect(deleted).toBe(1);
  });

  it('throws for invalid retentionDays values', async () => {
    await expect(cleanUpOldDeliveries(0)).rejects.toThrow(
      'retentionDays must be a positive integer',
    );
    await expect(cleanUpOldDeliveries(-1)).rejects.toThrow(
      'retentionDays must be a positive integer',
    );
    await expect(cleanUpOldDeliveries(1.5)).rejects.toThrow(
      'retentionDays must be a positive integer',
    );
  });
});

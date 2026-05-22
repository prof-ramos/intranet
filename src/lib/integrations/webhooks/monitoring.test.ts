/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for self-referencing builders */
import { describe, it, expect, vi } from 'vitest';
import { getFailedDeliveries } from './monitoring';

const { dbMock } = vi.hoisted(() => {
  const selectChain: Record<string, any> = {};
  selectChain.from = vi.fn().mockReturnValue(selectChain);
  selectChain.innerJoin = vi.fn().mockReturnValue(selectChain);
  selectChain.where = vi.fn().mockReturnValue(selectChain);
  selectChain.orderBy = vi.fn().mockReturnValue(selectChain);
  selectChain.limit = vi.fn().mockResolvedValue([]);

  const dbMock = {
    select: vi.fn().mockReturnValue(selectChain),
    _selectChain: selectChain,
  };

  return { dbMock };
});

vi.mock('@/lib/db', () => ({
  db: dbMock,
}));

describe('webhook monitoring', () => {
  it('getFailedDeliveries queries for failed status with default limit', async () => {
    const results = await getFailedDeliveries();
    expect(results).toEqual([]);
    expect(dbMock._selectChain.limit).toHaveBeenCalledWith(50);
  });

  it('getFailedDeliveries respects custom limit', async () => {
    await getFailedDeliveries(10);
    expect(dbMock._selectChain.limit).toHaveBeenCalledWith(10);
  });

  it('getFailedDeliveries returns failed delivery records', async () => {
    const failedRecord = {
      id: 42,
      eventType: 1,
      subscriptionName: 'Test Hook',
      targetUrl: 'https://example.com/webhook',
      attempt: 3,
      statusCode: 500,
      failureReason: 'Max retry attempts (5) exhausted.',
      failedAt: new Date('2026-05-15T10:00:00.000Z'),
    };
    dbMock._selectChain.limit.mockResolvedValueOnce([failedRecord]);

    const results = await getFailedDeliveries();
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(failedRecord);
  });
});

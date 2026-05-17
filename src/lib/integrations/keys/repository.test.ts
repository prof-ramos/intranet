import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  selectLimitMock,
  selectMock,
  updateReturningMock,
  updateMock,
} = vi.hoisted(() => {
  const selectLimit = vi.fn();
  const selectWhere = vi.fn(() => ({ limit: selectLimit }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from: selectFrom }));

  const updateReturning = vi.fn();
  const updateWhere = vi.fn(() => ({ returning: updateReturning }));
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));

  return {
    selectLimitMock: selectLimit,
    selectWhereMock: selectWhere,
    selectFromMock: selectFrom,
    selectMock: select,
    updateReturningMock: updateReturning,
    updateWhereMock: updateWhere,
    updateSetMock: updateSet,
    updateMock: update,
  };
});

vi.mock('@/lib/db', () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

vi.mock('@/lib/db/schema/integrations', () => ({
  integrationApiKeys: {
    id: 'id',
    name: 'name',
    keyHash: 'keyHash',
    scopes: 'scopes',
    isActive: 'isActive',
    lastUsedAt: 'lastUsedAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...conds: unknown[]) => ({ and: conds })),
  eq: vi.fn((col: string, val: unknown) => ({ op: 'eq', col, val })),
}));

import { findActiveApiKeyByHash, updateApiKeyLastUsed } from './repository';

describe('integration api keys repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectLimitMock.mockResolvedValue([]);
    updateReturningMock.mockResolvedValue([]);
  });

  it('returns null when no active api key matches the hash', async () => {
    await expect(findActiveApiKeyByHash('missing-hash')).resolves.toBeNull();
  });

  it('returns the active api key record with typed scopes', async () => {
    const record = {
      id: 7,
      name: 'Prod key',
      keyHash: 'hash-123',
      scopes: ['events:read', 'webhooks:manage'],
      isActive: true,
    };
    selectLimitMock.mockResolvedValueOnce([record]);

    await expect(findActiveApiKeyByHash('hash-123')).resolves.toEqual(record);
    expect(selectLimitMock).toHaveBeenCalledWith(1);
  });

  it('updates lastUsedAt for the matching hash', async () => {
    const updatedRows = [{ id: 7 }];
    updateReturningMock.mockResolvedValueOnce(updatedRows);

    await expect(updateApiKeyLastUsed('hash-123')).resolves.toBe(updatedRows);
    expect(updateMock).toHaveBeenCalledTimes(1);
  });
});

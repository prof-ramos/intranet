import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  insertReturningMock,
  insertMock,
  selectLimitMock,
  selectOrderByMock,
  selectMock,
  updateReturningMock,
  updateMock,
  descMock,
  ascMock,
} = vi.hoisted(() => {
  const insertReturning = vi.fn();
  const onConflictDoNothing = vi.fn(() => ({ returning: insertReturning }));
  const insertValues = vi.fn(() => ({ onConflictDoNothing }));
  const insert = vi.fn(() => ({ values: insertValues }));

  const selectLimit = vi.fn();
  const selectOrderBy = vi.fn(() => ({ limit: selectLimit }));
  const selectWhere = vi.fn(() => ({
    orderBy: selectOrderBy,
    limit: selectLimit,
  }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from: selectFrom }));

  const updateReturning = vi.fn();
  const updateWhere = vi.fn(() => ({ returning: updateReturning }));
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));

  const desc = vi.fn((value: unknown) => ({ dir: 'desc', value }));
  const asc = vi.fn((value: unknown) => ({ dir: 'asc', value }));

  return {
    insertReturningMock: insertReturning,
    onConflictDoNothingMock: onConflictDoNothing,
    insertValuesMock: insertValues,
    insertMock: insert,
    selectLimitMock: selectLimit,
    selectOrderByMock: selectOrderBy,
    selectWhereMock: selectWhere,
    selectFromMock: selectFrom,
    selectMock: select,
    updateReturningMock: updateReturning,
    updateWhereMock: updateWhere,
    updateSetMock: updateSet,
    updateMock: update,
    descMock: desc,
    ascMock: asc,
  };
});

vi.mock('@/lib/db', () => ({
  db: {
    insert: insertMock,
    select: selectMock,
    update: updateMock,
  },
}));

vi.mock('@/lib/db/schema', () => ({
  notifications: {
    id: 'id',
    userId: 'userId',
    actorId: 'actorId',
    type: 'type',
    title: 'title',
    message: 'message',
    href: 'href',
    entityType: 'entityType',
    entityId: 'entityId',
    dedupeKey: 'dedupeKey',
    readAt: 'readAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...conds: unknown[]) => ({ and: conds })),
  asc: (value: unknown) => ascMock(value),
  count: vi.fn(() => 'count(*)'),
  desc: (value: unknown) => descMock(value),
  eq: vi.fn((col: string, val: unknown) => ({ op: 'eq', col, val })),
  isNull: vi.fn((col: string) => ({ op: 'isNull', col })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
}));

import {
  countUnreadNotificationsForUser,
  createNotification,
  findNotificationByIdForUser,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from './repository';

describe('notifications repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertReturningMock.mockResolvedValue([]);
    selectLimitMock.mockResolvedValue([]);
    updateReturningMock.mockResolvedValue([]);
  });

  it('returns the inserted notification when creation succeeds', async () => {
    const created = { id: 10, userId: 7 };
    insertReturningMock.mockResolvedValueOnce([created]);

    const result = await createNotification({
      userId: 7,
      actorId: 2,
      type: 'activity.completed',
      title: 'Titulo',
      message: 'Mensagem',
      dedupeKey: 'activity:1',
    });

    expect(result).toBe(created);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it('returns the latest existing notification for a dedupe conflict with deterministic ordering', async () => {
    const existing = { id: 12, userId: 7, dedupeKey: 'activity:1' };
    selectLimitMock.mockResolvedValueOnce([existing]);

    const result = await createNotification({
      userId: 7,
      actorId: 2,
      type: 'activity.completed',
      title: 'Titulo',
      message: 'Mensagem',
      dedupeKey: 'activity:1',
    });

    expect(result).toBe(existing);
    expect(selectOrderByMock).toHaveBeenCalledWith(
      { dir: 'desc', value: 'createdAt' },
      { dir: 'desc', value: 'id' },
    );
  });

  it('returns null on insert conflict when no dedupe key is provided', async () => {
    const result = await createNotification({
      userId: 7,
      actorId: 2,
      type: 'activity.completed',
      title: 'Titulo',
      message: 'Mensagem',
      dedupeKey: null,
    });

    expect(result).toBeNull();
    expect(selectMock).not.toHaveBeenCalled();
  });

  it('lists notifications for a user with the requested limit', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    selectLimitMock.mockResolvedValueOnce(rows);

    const result = await listNotificationsForUser(7, 15);

    expect(result).toBe(rows);
    expect(selectLimitMock).toHaveBeenCalledWith(15);
  });

  it('returns unread counts with zero fallback', async () => {
    const executorWithRows = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 3 }])),
        })),
      })),
    };
    expect(await countUnreadNotificationsForUser(7, executorWithRows as never)).toBe(3);

    const executorWithoutRows = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
        })),
      })),
    };
    expect(await countUnreadNotificationsForUser(7, executorWithoutRows as never)).toBe(0);
  });

  it('returns the updated notification when marking one as read', async () => {
    const updated = { id: 3, readAt: new Date() };
    updateReturningMock.mockResolvedValueOnce([updated]);

    const result = await markNotificationRead({ id: 3, userId: 7 });

    expect(result).toBe(updated);
  });

  it('returns the updated ids when marking all as read', async () => {
    const updated = [{ id: 1 }, { id: 2 }];
    updateReturningMock.mockResolvedValueOnce(updated);

    const result = await markAllNotificationsRead(7);

    expect(result).toBe(updated);
  });

  it('finds one notification by id and user', async () => {
    const notification = { id: 9, userId: 7 };
    const limitMock = vi.fn(() => Promise.resolve([notification]));
    const orderByMock = vi.fn(() => ({ limit: limitMock }));
    const executor = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ orderBy: orderByMock })),
        })),
      })),
    };

    const result = await findNotificationByIdForUser({ id: 9, userId: 7 }, executor as never);

    expect(result).toBe(notification);
    expect(orderByMock).toHaveBeenCalledWith({ dir: 'asc', value: 'id' });
  });
});

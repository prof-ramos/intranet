/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for self-referencing builders */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  mapActivityRowToBoardActivity,
  findActivities,
  findActiveAdmins,
  findActiveAssociates,
  insertActivity,
  findActivityById,
  updateActivityById,
} from './repository';

const { dbMock, MOCK_ACTIVITY, MOCK_ADMIN, MOCK_ASSOCIATE } = vi.hoisted(() => {
  const MOCK_ACTIVITY = {
    id: 1,
    title: 'Test Activity',
    description: 'Desc',
    status: 'a_fazer',
    priority: 'normal',
    dueDate: '2026-06-01',
    completedAt: null,
    assigneeId: 1,
    assigneeName: 'Admin',
    associateId: 10,
    associateName: 'Associate',
    tags: ['urgent'],
  };
  const MOCK_ADMIN = { id: 1, name: 'Admin', role: 'admin' as const };
  const MOCK_ASSOCIATE = { id: 10, name: 'Associate' };

  let _selectResult: any[] = [MOCK_ACTIVITY];
  let _insertResult: any[] = [MOCK_ACTIVITY];

  const selectChain: Record<string, any> = {};
  selectChain.from = vi.fn().mockReturnValue(selectChain);
  selectChain.leftJoin = vi.fn().mockReturnValue(selectChain);
  selectChain.where = vi.fn().mockReturnValue(selectChain);
  selectChain.orderBy = vi.fn().mockReturnValue(selectChain);
  selectChain.groupBy = vi.fn().mockReturnValue(selectChain);
  selectChain.limit = vi.fn().mockReturnValue(selectChain);
  selectChain.offset = vi.fn().mockImplementation(() => Promise.resolve(_selectResult));
  selectChain.then = (resolve: any, reject: any) =>
    Promise.resolve(_selectResult).then(resolve, reject);

  const insertChain: Record<string, any> = {};
  insertChain.values = vi.fn().mockReturnValue(insertChain);
  insertChain.returning = vi.fn().mockImplementation(() => Promise.resolve(_insertResult));

  const updateChain: Record<string, any> = {};
  updateChain.set = vi.fn().mockReturnValue(updateChain);
  updateChain.where = vi.fn().mockReturnValue(updateChain);
  updateChain.returning = vi.fn().mockImplementation(() => Promise.resolve(_insertResult));

  const dbMock = {
    select: vi.fn().mockReturnValue(selectChain),
    insert: vi.fn().mockReturnValue(insertChain),
    update: vi.fn().mockReturnValue(updateChain),
    _selectChain: selectChain,
    _insertChain: insertChain,
    _updateChain: updateChain,
    setSelectResult(val: any[]) {
      _selectResult = val;
    },
    setInsertResult(val: any[]) {
      _insertResult = val;
    },
  };

  return { dbMock, MOCK_ACTIVITY, MOCK_ADMIN, MOCK_ASSOCIATE };
});

vi.mock('@/lib/db', () => ({ db: dbMock }));

describe('activities repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.setSelectResult([MOCK_ACTIVITY]);
    dbMock.setInsertResult([MOCK_ACTIVITY]);
  });

  describe('mapActivityRowToBoardActivity', () => {
    it('maps a full activity row', () => {
      const result = mapActivityRowToBoardActivity(MOCK_ACTIVITY as any);
      expect(result.id).toBe(1);
      expect(result.title).toBe('Test Activity');
      expect(result.tags).toEqual(['urgent']);
      expect(result.dueOffset).toBeNull();
    });

    it('converts completedAt to ISO string', () => {
      const date = new Date('2026-05-15T10:00:00.000Z');
      const result = mapActivityRowToBoardActivity({ ...MOCK_ACTIVITY, completedAt: date } as any);
      expect(result.completedAt).toBe(date.toISOString());
    });

    it('defaults tags to empty array when null', () => {
      const result = mapActivityRowToBoardActivity({ ...MOCK_ACTIVITY, tags: null } as any);
      expect(result.tags).toEqual([]);
    });
  });

  describe('findActivities', () => {
    it('queries with default limit 200', async () => {
      const results = await findActivities();
      expect(results).toEqual([MOCK_ACTIVITY]);
      expect(dbMock._selectChain.limit).toHaveBeenCalledWith(200);
    });

    it('clamps limit to MAX_ACTIVITY_LIMIT (500)', async () => {
      await findActivities({ limit: 999 });
      expect(dbMock._selectChain.limit).toHaveBeenCalledWith(500);
    });

    it('clamps negative limit to 1', async () => {
      await findActivities({ limit: -5 });
      expect(dbMock._selectChain.limit).toHaveBeenCalledWith(1);
    });

    it('applies offset when provided', async () => {
      await findActivities({ offset: 20 });
      expect(dbMock._selectChain.offset).toHaveBeenCalledWith(20);
    });

    it.each([
      ['overdue', { dueLate: true }],
      ['open', { openOnly: true }],
      ['status', { status: 'em_andamento' as const }],
    ])('applies the board limit to the filtered %s queue', async (_label, options) => {
      await findActivities(options);

      expect(dbMock._selectChain.where).toHaveBeenCalledWith(expect.anything());
      expect(dbMock._selectChain.limit).toHaveBeenCalledWith(200);
      expect(dbMock._selectChain.offset).toHaveBeenCalledWith(0);
    });

    it('sorts the recent window into board order with newest cards as tie-breaker', async () => {
      dbMock.setSelectResult([
        { ...MOCK_ACTIVITY, id: 3, status: 'em_andamento', priority: 'urgente' },
        { ...MOCK_ACTIVITY, id: 1, status: 'a_fazer', priority: 'normal', dueDate: null },
        { ...MOCK_ACTIVITY, id: 2, status: 'a_fazer', priority: 'normal', dueDate: null },
      ]);

      const results = await findActivities();

      expect(results.map((activity) => activity.id)).toEqual([2, 1, 3]);
      expect(dbMock._selectChain.orderBy).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('findActiveAdmins', () => {
    it('queries for active admins', async () => {
      dbMock.setSelectResult([MOCK_ADMIN]);
      const results = await findActiveAdmins();
      expect(results).toEqual([MOCK_ADMIN]);
      expect(dbMock._selectChain.where).toHaveBeenCalled();
    });
  });

  describe('findActiveAssociates', () => {
    it('queries for ativo associates with limit 100', async () => {
      dbMock.setSelectResult([MOCK_ASSOCIATE]);
      const results = await findActiveAssociates();
      expect(results).toEqual([MOCK_ASSOCIATE]);
      expect(dbMock._selectChain.limit).toHaveBeenCalledWith(100);
    });
  });

  describe('insertActivity', () => {
    it('inserts and returns the new activity', async () => {
      dbMock.setInsertResult([MOCK_ACTIVITY]);
      const result = await insertActivity({
        title: 'Test Activity',
        description: null,
        status: 'a_fazer',
        priority: 'normal',
        assigneeId: 1,
        associateId: null,
        dueDate: null,
        tags: [],
        createdBy: 1,
      });
      expect(result).toEqual(MOCK_ACTIVITY);
      expect(dbMock.insert).toHaveBeenCalled();
    });
  });

  describe('findActivityById', () => {
    it('returns a single activity or null', async () => {
      dbMock.setSelectResult([{ ...MOCK_ACTIVITY, revision: 42 }]);
      await expect(findActivityById(1)).resolves.toEqual({ ...MOCK_ACTIVITY, revision: 42 });

      dbMock.setSelectResult([]);
      await expect(findActivityById(2)).resolves.toBeNull();
    });
  });

  describe('updateActivityById', () => {
    it('updates the activity and returns the updated row', async () => {
      dbMock.setInsertResult([{ ...MOCK_ACTIVITY, status: 'concluido' }]);

      const result = await updateActivityById(1, { status: 'concluido' as any }, 42);

      expect(result).toEqual({ ...MOCK_ACTIVITY, status: 'concluido' });
      expect(dbMock.update).toHaveBeenCalled();
      expect(dbMock._updateChain.set).toHaveBeenCalled();
      expect(dbMock._updateChain.where).toHaveBeenCalledWith(expect.anything());
      expect(dbMock._updateChain.returning).toHaveBeenCalled();
    });
  });
});

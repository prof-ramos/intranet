/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for query builders */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assignLabelToActivity,
  deactivateLabel,
  findActiveLabels,
  findActivityLabelAssignment,
  findLabelBySlug,
  findLabelsByActivityId,
  insertLabel,
  removeLabelFromActivity,
} from './labels-repository';

const { dbMock, MOCK_LABEL, MOCK_ASSIGNMENT } = vi.hoisted(() => {
  const MOCK_LABEL = {
    id: 7,
    name: 'Financeiro',
    slug: 'financeiro',
    colorToken: '#123456',
    active: true,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
  };
  const MOCK_ASSIGNMENT = {
    activityId: 42,
    labelId: 7,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    createdBy: 3,
  };

  let selectResult: any[] = [MOCK_LABEL];
  let insertResult: any[] = [MOCK_LABEL];
  let updateResult: any[] = [MOCK_LABEL];
  let deleteResult: any[] = [MOCK_ASSIGNMENT];

  const selectChain: Record<string, any> = {};
  selectChain.from = vi.fn().mockReturnValue(selectChain);
  selectChain.innerJoin = vi.fn().mockReturnValue(selectChain);
  selectChain.where = vi.fn().mockReturnValue(selectChain);
  selectChain.orderBy = vi.fn().mockReturnValue(selectChain);
  selectChain.limit = vi.fn().mockReturnValue(selectChain);
  selectChain.then = (resolve: any, reject: any) =>
    Promise.resolve(selectResult).then(resolve, reject);

  const insertChain: Record<string, any> = {};
  insertChain.values = vi.fn().mockReturnValue(insertChain);
  insertChain.returning = vi.fn().mockImplementation(() => Promise.resolve(insertResult));

  const updateChain: Record<string, any> = {};
  updateChain.set = vi.fn().mockReturnValue(updateChain);
  updateChain.where = vi.fn().mockReturnValue(updateChain);
  updateChain.returning = vi.fn().mockImplementation(() => Promise.resolve(updateResult));

  const deleteChain: Record<string, any> = {};
  deleteChain.where = vi.fn().mockReturnValue(deleteChain);
  deleteChain.returning = vi.fn().mockImplementation(() => Promise.resolve(deleteResult));

  const dbMock = {
    select: vi.fn().mockReturnValue(selectChain),
    insert: vi.fn().mockReturnValue(insertChain),
    update: vi.fn().mockReturnValue(updateChain),
    delete: vi.fn().mockReturnValue(deleteChain),
    _selectChain: selectChain,
    _insertChain: insertChain,
    _updateChain: updateChain,
    _deleteChain: deleteChain,
    setSelectResult(value: any[]) {
      selectResult = value;
    },
    setInsertResult(value: any[]) {
      insertResult = value;
    },
    setUpdateResult(value: any[]) {
      updateResult = value;
    },
    setDeleteResult(value: any[]) {
      deleteResult = value;
    },
  };

  return {
    dbMock,
    MOCK_LABEL,
    MOCK_ASSIGNMENT,
  };
});

vi.mock('@/lib/db', () => ({ db: dbMock }));

describe('activity labels repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.setSelectResult([MOCK_LABEL]);
    dbMock.setInsertResult([MOCK_LABEL]);
    dbMock.setUpdateResult([MOCK_LABEL]);
    dbMock.setDeleteResult([MOCK_ASSIGNMENT]);
  });

  it('finds active labels ordered by name', async () => {
    await expect(findActiveLabels()).resolves.toEqual([MOCK_LABEL]);
    expect(dbMock._selectChain.where).toHaveBeenCalledWith(expect.anything());
    expect(dbMock._selectChain.orderBy).toHaveBeenCalledWith(expect.anything());
  });

  it('finds a label by slug and returns null when absent', async () => {
    await expect(findLabelBySlug('financeiro')).resolves.toEqual(MOCK_LABEL);

    dbMock.setSelectResult([]);
    await expect(findLabelBySlug('missing')).resolves.toBeNull();
  });

  it('inserts a label using the supplied executor', async () => {
    await expect(
      insertLabel({ name: 'Financeiro', slug: 'financeiro', colorToken: '#123456' }, dbMock as any),
    ).resolves.toEqual(MOCK_LABEL);
    expect(dbMock.insert).toHaveBeenCalled();
    expect(dbMock._insertChain.values).toHaveBeenCalledWith({
      name: 'Financeiro',
      slug: 'financeiro',
      colorToken: '#123456',
    });
  });

  it('deactivates a label and returns the updated row', async () => {
    await expect(deactivateLabel(7)).resolves.toEqual(MOCK_LABEL);
    expect(dbMock.update).toHaveBeenCalled();
    expect(dbMock._updateChain.set).toHaveBeenCalledWith({ active: false });
  });

  it('lists labels assigned to an activity', async () => {
    await expect(findLabelsByActivityId(42)).resolves.toEqual([MOCK_LABEL]);
    expect(dbMock._selectChain.innerJoin).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
    );
    expect(dbMock._selectChain.where).toHaveBeenCalledWith(expect.anything());
  });

  it('assigns a label to an activity with the creator id', async () => {
    dbMock.setInsertResult([MOCK_ASSIGNMENT]);
    await expect(assignLabelToActivity(42, 7, 3)).resolves.toEqual(MOCK_ASSIGNMENT);
    expect(dbMock._insertChain.values).toHaveBeenCalledWith({
      activityId: 42,
      labelId: 7,
      createdBy: 3,
    });
  });

  it('removes an activity label assignment', async () => {
    await expect(removeLabelFromActivity(42, 7)).resolves.toEqual(MOCK_ASSIGNMENT);
    expect(dbMock.delete).toHaveBeenCalled();
    expect(dbMock._deleteChain.where).toHaveBeenCalledWith(expect.anything());
  });

  it('finds a specific activity label assignment', async () => {
    dbMock.setSelectResult([MOCK_ASSIGNMENT]);
    await expect(findActivityLabelAssignment(42, 7)).resolves.toEqual(MOCK_ASSIGNMENT);

    dbMock.setSelectResult([]);
    await expect(findActivityLabelAssignment(42, 7, dbMock as any)).resolves.toBeNull();
  });
});

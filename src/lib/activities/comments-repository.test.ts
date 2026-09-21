/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for self-referencing builders */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findCommentById,
  findCommentsByActivityId,
  insertComment,
  softDeleteComment,
  updateComment,
} from './comments-repository';

const { dbMock, selectChain, insertChain, updateChain, comment, setSelectResult, setWriteResult } =
  vi.hoisted(() => {
    const comment = {
      id: 7,
      activityId: 12,
      authorAdminId: 3,
      content: 'Comentário',
      createdAt: new Date('2026-09-10T10:00:00.000Z'),
      updatedAt: new Date('2026-09-10T10:00:00.000Z'),
      deletedAt: null,
    };
    let selectResult: any[] = [comment];
    let writeResult: any[] = [comment];

    const selectChain: Record<string, any> = {};
    for (const method of ['from', 'where', 'orderBy', 'limit']) {
      selectChain[method] = vi.fn().mockReturnValue(selectChain);
    }
    selectChain.then = (resolve: any, reject: any) =>
      Promise.resolve(selectResult).then(resolve, reject);

    const insertChain: Record<string, any> = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockImplementation(() => Promise.resolve(writeResult)),
    };
    const updateChain: Record<string, any> = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockImplementation(() => Promise.resolve(writeResult)),
    };

    const dbMock = {
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue(insertChain),
      update: vi.fn().mockReturnValue(updateChain),
    };

    return {
      dbMock,
      selectChain,
      insertChain,
      updateChain,
      comment,
      setSelectResult: (value: any[]) => {
        selectResult = value;
      },
      setWriteResult: (value: any[]) => {
        writeResult = value;
      },
    };
  });

vi.mock('@/lib/db', () => ({ db: dbMock }));

describe('activity comments repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSelectResult([comment]);
    setWriteResult([comment]);
  });

  it('inserts a comment and returns it', async () => {
    await expect(
      insertComment({ activityId: 12, authorAdminId: 3, content: 'Comentário' }),
    ).resolves.toEqual(comment);
    expect(dbMock.insert).toHaveBeenCalled();
    expect(insertChain.values).toHaveBeenCalledWith({
      activityId: 12,
      authorAdminId: 3,
      content: 'Comentário',
    });
  });

  it('finds only an active comment by id', async () => {
    await expect(findCommentById(7)).resolves.toEqual(comment);
    expect(selectChain.where).toHaveBeenCalledWith(expect.anything());
  });

  it('lists active comments in creation order', async () => {
    const comments = [comment, { ...comment, id: 8 }];
    setSelectResult(comments);
    await expect(findCommentsByActivityId(12)).resolves.toEqual(comments);
    expect(selectChain.orderBy).toHaveBeenCalledWith(expect.anything(), expect.anything());
  });

  it('updates only an active comment', async () => {
    await expect(updateComment(7, 'Atualizado')).resolves.toEqual(comment);
    expect(updateChain.set).toHaveBeenCalledWith({
      content: 'Atualizado',
      updatedAt: expect.anything(),
    });
    expect(updateChain.where).toHaveBeenCalledWith(expect.anything());
  });

  it('soft-deletes an active comment', async () => {
    await expect(softDeleteComment(7)).resolves.toEqual(comment);
    expect(updateChain.set).toHaveBeenCalledWith({
      deletedAt: expect.any(Date),
      updatedAt: expect.anything(),
    });
    expect(updateChain.where).toHaveBeenCalledWith(expect.anything());
  });

  it('returns null when a write affects no active comment', async () => {
    setWriteResult([]);
    await expect(updateComment(999, 'Atualizado')).resolves.toBeNull();
    await expect(softDeleteComment(999)).resolves.toBeNull();
  });
});

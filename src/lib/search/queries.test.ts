/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { searchAssociates } from './queries';
import { escapeLikePattern } from '@/lib/db/like-pattern';

const { dbMock } = vi.hoisted(() => {
  let _selectResult: any[] = [];

  const selectChain: Record<string, any> = {};
  selectChain.from = vi.fn().mockReturnValue(selectChain);
  selectChain.where = vi.fn().mockReturnValue(selectChain);
  selectChain.orderBy = vi.fn().mockReturnValue(selectChain);
  selectChain.limit = vi.fn().mockReturnValue(selectChain);
  selectChain.then = (resolve: any, reject: any) =>
    Promise.resolve(_selectResult).then(resolve, reject);

  const dbMock = {
    select: vi.fn().mockReturnValue(selectChain),
    _selectChain: selectChain,
    setSelectResult(val: any[]) {
      _selectResult = val;
    },
  };

  return { dbMock };
});

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/db/like-pattern', () => ({
  escapeLikePattern: vi.fn((input: string) => input.replace(/\\/g, '\\\\').replace(/_/g, '\\_').replace(/%/g, '\\%'))
}));


describe('searchAssociates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.setSelectResult([]);
  });

  it('formats database rows into AssociateSearchResult objects', async () => {
    dbMock.setSelectResult([
      { id: 1, fullName: 'John Doe', assignment: 'SGP' },
      { id: 2, fullName: 'Jane Smith', assignment: null },
    ]);

    const results = await searchAssociates('query');

    expect(results).toEqual([
      {
        type: 'associate',
        id: 1,
        title: 'John Doe',
        subtitle: 'SGP',
        href: '/app/associados/1',
      },
      {
        type: 'associate',
        id: 2,
        title: 'Jane Smith',
        subtitle: null,
        href: '/app/associados/2',
      },
    ]);
  });

  it('escapes like pattern in the query', async () => {
    await searchAssociates('test%_value\\');

    expect(escapeLikePattern).toHaveBeenCalledWith('test%_value\\');
    expect(dbMock._selectChain.where).toHaveBeenCalled();
  });

  it('uses default limit of 5', async () => {
    await searchAssociates('query');
    expect(dbMock._selectChain.limit).toHaveBeenCalledWith(5);
  });

  it('uses custom limit when provided', async () => {
    await searchAssociates('query', 10);
    expect(dbMock._selectChain.limit).toHaveBeenCalledWith(10);
  });

  it('returns empty array when no matches', async () => {
    dbMock.setSelectResult([]);
    const results = await searchAssociates('nomatch');
    expect(results).toHaveLength(0);
  });
});

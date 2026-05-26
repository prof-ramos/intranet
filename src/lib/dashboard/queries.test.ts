/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for self-referencing builders */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SQL } from 'drizzle-orm';

function compileSql(fragment: SQL) {
  return fragment.toQuery({
    escapeName: (name: string) => `"${name}"`,
    escapeParam: (_: unknown, index: number) => `$${index + 1}`,
    escapeString: (value: string) => `'${value}'`,
    casing: { getColumnCasing: (column: string) => column },
    inlineParams: false,
    paramStartIndex: { value: 0 },
  } as never).sql;
}

const dbMock = vi.hoisted(() => {
  let selectResult: any[] = [];

  const selectChain: Record<string, any> = {};
  selectChain.from = vi.fn().mockReturnValue(selectChain);
  selectChain.where = vi.fn().mockReturnValue(selectChain);
  selectChain.groupBy = vi.fn().mockReturnValue(selectChain);
  selectChain.orderBy = vi.fn().mockReturnValue(selectChain);
  selectChain.limit = vi.fn().mockReturnValue(selectChain);
  selectChain.leftJoin = vi.fn().mockReturnValue(selectChain);
  selectChain.then = (resolve: any, reject: any) =>
    Promise.resolve(selectResult).then(resolve, reject);

  return {
    select: vi.fn().mockImplementation((shape?: unknown) => {
      dbMock.lastSelectShape = shape;
      return selectChain;
    }),
    _selectChain: selectChain,
    lastSelectShape: undefined as unknown,
    setSelectResult(value: any[]) {
      selectResult = value;
    },
  };
});

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: any[]) => any) => fn,
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));

import { countActiveAssociatesByLocation, getTopRegions } from './queries';

describe('dashboard queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.lastSelectShape = undefined;
    dbMock.setSelectResult([{ brasil: 0, exterior: 0 }]);
  });

  it('counts Brasil, Brazil and null/blank as nacional', async () => {
    await countActiveAssociatesByLocation();

    const selectShape = dbMock.lastSelectShape as Record<string, SQL>;
    const brasilSql = compileSql(selectShape.brasil);
    const exteriorSql = compileSql(selectShape.exterior);

    expect(brasilSql).toContain('count(*) filter');
    expect(brasilSql).toContain(' is null');
    expect(brasilSql).toContain('nullif(btrim(');
    expect(brasilSql).toContain("in ('brasil', 'brazil')");

    expect(exteriorSql).toContain('count(*) filter');
    expect(exteriorSql).toContain('not (');
    expect(exteriorSql).toContain("in ('brasil', 'brazil')");
  });

  it('normalizes Brazil aliases when grouping top regions', async () => {
    dbMock.setSelectResult([]);

    await getTopRegions(6);

    const selectShape = dbMock.lastSelectShape as Record<string, SQL>;
    const countrySql = compileSql(selectShape.country);

    expect(countrySql).toContain('when lower(btrim(');
    expect(countrySql).toContain("in ('brasil', 'brazil') then 'Brasil'");
    expect(dbMock._selectChain.groupBy).toHaveBeenCalled();
  });
});

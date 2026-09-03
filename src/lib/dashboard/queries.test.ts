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

import * as dashboardQueries from './queries';

describe('dashboard queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.lastSelectShape = undefined;
    dbMock.setSelectResult([{ brasil: 0, exterior: 0 }]);
  });

  it('loads all associate metrics in one filtered aggregate', async () => {
    dbMock.setSelectResult([
      {
        active: 763,
        brasil: 282,
        exterior: 481,
        contributionsOk: 700,
        inadimplentes: 63,
      },
    ]);

    const getAssociateMetrics = (
      dashboardQueries as typeof dashboardQueries & {
        getAssociateMetrics?: () => Promise<{
          active: number;
          byLocation: { brasil: number; exterior: number };
          contributionsOk: number;
          inadimplentes: number;
        }>;
      }
    ).getAssociateMetrics;
    expect(getAssociateMetrics).toBeTypeOf('function');
    if (!getAssociateMetrics) return;

    const result = await getAssociateMetrics();

    const selectShape = dbMock.lastSelectShape as Record<string, SQL>;
    const brasilSql = compileSql(selectShape.brasil);
    const exteriorSql = compileSql(selectShape.exterior);

    expect(compileSql(selectShape.active)).toContain('count(*) filter');
    expect(compileSql(selectShape.contributionsOk)).toContain('count(*) filter');
    expect(compileSql(selectShape.inadimplentes)).toContain('count(*) filter');
    expect(brasilSql).toContain('count(*) filter');
    expect(brasilSql).toContain('coalesce(');
    expect(brasilSql).toContain('::text');
    expect(brasilSql).toContain("= 'nacional'");
    expect(brasilSql).toContain(' is null');
    expect(brasilSql).toContain('nullif(btrim(');
    expect(brasilSql).toContain("'brasil'");
    expect(brasilSql).toContain("'brazil'");
    expect(brasilSql).toContain("'brasili'");

    expect(exteriorSql).toContain('count(*) filter');
    expect(exteriorSql).toContain('coalesce(');
    expect(exteriorSql).toContain('::text');
    expect(exteriorSql).toContain("= 'exterior'");
    expect(dbMock._selectChain.leftJoin).toHaveBeenCalled();
    expect(dbMock.select).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      active: 763,
      byLocation: { brasil: 282, exterior: 481 },
      contributionsOk: 700,
      inadimplentes: 63,
    });
  });

  it('loads open, overdue, and per-status activity metrics in one aggregate', async () => {
    dbMock.setSelectResult([
      {
        open: 12,
        overdue: 3,
        aFazer: 4,
        emAndamento: 5,
        aguardandoTerceiros: 2,
        concluido: 1,
      },
    ]);

    const getActivityMetrics = (
      dashboardQueries as typeof dashboardQueries & {
        getActivityMetrics?: () => Promise<{
          open: number;
          overdue: number;
          byStatus: { status: string; total: number }[];
        }>;
      }
    ).getActivityMetrics;
    expect(getActivityMetrics).toBeTypeOf('function');
    if (!getActivityMetrics) return;

    const result = await getActivityMetrics();
    const selectShape = dbMock.lastSelectShape as Record<string, SQL>;

    expect(compileSql(selectShape.open)).toContain('count(*) filter');
    expect(compileSql(selectShape.overdue)).toContain('count(*) filter');
    expect(compileSql(selectShape.aFazer)).toContain("= 'a_fazer'");
    expect(compileSql(selectShape.emAndamento)).toContain("= 'em_andamento'");
    expect(compileSql(selectShape.aguardandoTerceiros)).toContain("= 'aguardando_terceiros'");
    expect(compileSql(selectShape.concluido)).toContain("= 'concluido'");
    expect(dbMock.select).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      open: 12,
      overdue: 3,
      byStatus: [
        { status: 'a_fazer', total: 4 },
        { status: 'em_andamento', total: 5 },
        { status: 'aguardando_terceiros', total: 2 },
        { status: 'concluido', total: 1 },
      ],
    });
  });

  it('normalizes country aliases without assignments join', async () => {
    dbMock.setSelectResult([]);

    await dashboardQueries.getTopRegions(6);

    const selectShape = dbMock.lastSelectShape as Record<string, SQL>;
    const countrySql = compileSql(selectShape.country);

    // Normalizes country labels via alias groups
    expect(countrySql).toContain('case');
    expect(countrySql).toContain('when lower(btrim(');
    // Domestic alias group includes Brasil variants
    expect(countrySql).toContain("'brasil'");
    expect(countrySql).toContain("'brazil'");
    expect(countrySql).toContain("'Brasil'");
    // EUA alias group
    expect(countrySql).toContain("'Estados Unidos'");
    // Fallback title-case via chained replace() for connector-word lowering
    expect(countrySql).toContain('replace(');
    expect(countrySql).not.toContain('$');
    // Query must be groupable without assignments.type (bug #dashboard-sql-groupby)
    expect(dbMock._selectChain.leftJoin).not.toHaveBeenCalled();
    expect(dbMock._selectChain.groupBy).toHaveBeenCalled();
  });
});

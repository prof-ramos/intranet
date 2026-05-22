/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for self-referencing builders */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SQL } from 'drizzle-orm';
import {
  findMonthlyPayment,
  getAssociatesWithPayments,
  markOverduePaymentsForAudit,
  upsertMonthlyPayment,
} from './repository';

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

const { dbMock, MOCK_PAYMENT } = vi.hoisted(() => {
  const MOCK_PAYMENT = {
    id: 1,
    associateId: 10,
    year: 2026,
    month: 5,
    status: 'pago',
    paymentMethod: 'folha',
    paidAt: new Date('2026-05-10'),
    cancelledAt: null,
    cancellationReason: null,
    cancelledBy: null,
    updatedBy: 1,
    updatedAt: new Date('2026-05-10'),
  };

  let _selectResult: any[] = [MOCK_PAYMENT];
  let _insertResult: any[] = [MOCK_PAYMENT];

  const selectChain: Record<string, any> = {};
  selectChain.from = vi.fn().mockReturnValue(selectChain);
  selectChain.innerJoin = vi.fn().mockReturnValue(selectChain);
  selectChain.leftJoin = vi.fn().mockReturnValue(selectChain);
  selectChain.where = vi.fn().mockReturnValue(selectChain);
  selectChain.orderBy = vi.fn().mockReturnValue(selectChain);
  selectChain.limit = vi.fn().mockImplementation(() => Promise.resolve(_selectResult));
  selectChain.then = (resolve: any, reject: any) =>
    Promise.resolve(_selectResult).then(resolve, reject);

  const insertChain: Record<string, any> = {};
  insertChain.values = vi.fn().mockReturnValue(insertChain);
  insertChain.onConflictDoUpdate = vi.fn().mockReturnValue(insertChain);
  insertChain.returning = vi.fn().mockImplementation(() => Promise.resolve(_insertResult));

  let _updateResult: any[] = [];
  const updateChain: Record<string, any> = {};
  updateChain.set = vi.fn().mockReturnValue(updateChain);
  updateChain.where = vi.fn().mockReturnValue(updateChain);
  updateChain.returning = vi.fn().mockImplementation(() => Promise.resolve(_updateResult));

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
    setUpdateResult(val: any[]) {
      _updateResult = val;
    },
  };

  return { dbMock, MOCK_PAYMENT };
});

vi.mock('@/lib/db', () => ({ db: dbMock }));

describe('finance repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.setSelectResult([MOCK_PAYMENT]);
    dbMock.setInsertResult([MOCK_PAYMENT]);
    dbMock.setUpdateResult([]);
  });

  describe('findMonthlyPayment', () => {
    it('returns payment when found', async () => {
      dbMock.setSelectResult([MOCK_PAYMENT]);
      const result = await findMonthlyPayment(10, 2026, 5);
      expect(result).toEqual(MOCK_PAYMENT);
    });

    it('returns null when not found', async () => {
      dbMock.setSelectResult([]);
      const result = await findMonthlyPayment(999, 2026, 1);
      expect(result).toBeNull();
    });
  });

  describe('upsertMonthlyPayment', () => {
    it('calls insert with onConflictDoUpdate', async () => {
      dbMock.setInsertResult([MOCK_PAYMENT]);
      await upsertMonthlyPayment(MOCK_PAYMENT as any);
      expect(dbMock.insert).toHaveBeenCalled();
      expect(dbMock._insertChain.onConflictDoUpdate).toHaveBeenCalled();
    });
  });

  describe('markOverduePaymentsForAudit', () => {
    it('marks overdue payments with a system actor and returns auditable rows', async () => {
      const transitionedPayment = {
        id: 5,
        associateId: 10,
        year: 2026,
        month: 4,
        status: 'atrasado',
        paymentMethod: 'boleto',
        paidAt: null,
        cancelledAt: null,
        cancellationReason: null,
        cancelledBy: null,
      };
      dbMock.setUpdateResult([transitionedPayment]);

      const result = await markOverduePaymentsForAudit();

      expect(result).toEqual([transitionedPayment]);
      expect(dbMock.update).toHaveBeenCalled();
      expect(dbMock._updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'atrasado',
          updatedBy: null,
        }),
      );
      expect(dbMock._updateChain.returning).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.anything(),
          associateId: expect.anything(),
          year: expect.anything(),
          month: expect.anything(),
          status: expect.anything(),
          paymentMethod: expect.anything(),
          paidAt: expect.anything(),
          cancelledAt: expect.anything(),
          cancellationReason: expect.anything(),
          cancelledBy: expect.anything(),
        }),
      );
    });
  });

  describe('getAssociatesWithPayments', () => {
    it('queries with default filters (only ativo associates)', async () => {
      dbMock.setSelectResult([{ associateId: 10, fullName: 'Test' }]);
      const results = await getAssociatesWithPayments(2026, 5);
      expect(results).toHaveLength(1);
      expect(dbMock._selectChain.where).toHaveBeenCalled();
    });

    it('applies status filter', async () => {
      dbMock.setSelectResult([]);
      await getAssociatesWithPayments(2026, 5, { status: 'pago' });
      expect(dbMock._selectChain.where).toHaveBeenCalled();
    });

    it('applies location filter for brasil', async () => {
      dbMock.setSelectResult([]);
      await getAssociatesWithPayments(2026, 5, { location: 'brasil' });
      expect(dbMock._selectChain.where).toHaveBeenCalled();
      const whereClause = dbMock._selectChain.where.mock.calls.at(-1)?.[0];
      const compiled = compileSql(whereClause);
      expect(compiled).toContain(' is null');
      expect(compiled).toContain('lower(btrim(');
      expect(compiled).toContain('nullif(btrim(');
      expect(compiled).toContain("in ('brasil', 'brazil')");
    });

    it('applies location filter for exterior as inverse of domestic aliases', async () => {
      dbMock.setSelectResult([]);
      await getAssociatesWithPayments(2026, 5, { location: 'exterior' });
      expect(dbMock._selectChain.where).toHaveBeenCalled();
      const whereClause = dbMock._selectChain.where.mock.calls.at(-1)?.[0];
      const compiled = compileSql(whereClause);
      expect(compiled).toContain('not (');
      expect(compiled).toContain("in ('brasil', 'brazil')");
    });

    it('applies method filter', async () => {
      dbMock.setSelectResult([]);
      await getAssociatesWithPayments(2026, 5, { method: 'pix' });
      expect(dbMock._selectChain.where).toHaveBeenCalled();
      const whereClause = dbMock._selectChain.where.mock.calls.at(-1)?.[0];
      const compiled = compileSql(whereClause);
      expect(compiled).toContain('coalesce(');
      expect(compiled).toContain('= $');
    });
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for self-referencing builders */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  findOfficialLetters,
  findOfficialLetterById,
  getLastSequenceForYear,
  createOfficialLetter,
  cancelOfficialLetter,
} from './repository';

const { dbMock, MOCK_RESULT } = vi.hoisted(() => {
  const MOCK_RESULT = {
    id: 1,
    number: 'OFÍCIO No 001/2026/ASOF',
    year: 2026,
    sequence: 1,
    recipient: 'Destinatário',
    recipientRole: 'Cargo',
    vocativo: 'Senhor',
    letterDate: '15 de maio de 2026',
    subject: 'Assunto',
    itamaratySector: 'SGP',
    signatoryName: 'Nome',
    signatoryRole: 'Cargo',
    closure: 'Atenciosamente,',
    bodyRichText: 'Texto',
    bodyPlainText: 'Texto',
    pdfStoragePath: null,
    status: 'gerado',
    createdBy: 1,
    updatedBy: 1,
    createdAt: new Date('2026-05-15T10:00:00.000Z'),
    updatedAt: new Date('2026-05-15T11:00:00.000Z'),
  };

  // Shared resolve values per chain type
  let _selectResult: any[] = [MOCK_RESULT];
  let _insertResult: any[] = [MOCK_RESULT];
  let _updateResult: any[] = [MOCK_RESULT];

  // Self-referencing chain mock for Drizzle query builder
  // Drizzle query builders are thenable — the chain must support `await` at any point
  const selectChain: Record<string, any> = {};
  selectChain.from = vi.fn().mockReturnValue(selectChain);
  selectChain.where = vi.fn().mockReturnValue(selectChain);
  selectChain.orderBy = vi.fn().mockReturnValue(selectChain);
  selectChain.limit = vi.fn().mockImplementation(() => Promise.resolve(_selectResult));
  selectChain.then = (resolve: any, reject: any) =>
    Promise.resolve(_selectResult).then(resolve, reject);

  const insertChain: Record<string, any> = {};
  insertChain.values = vi.fn().mockReturnValue(insertChain);
  insertChain.returning = vi.fn().mockImplementation(() => Promise.resolve(_insertResult));

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

  return { dbMock, MOCK_RESULT };
});

vi.mock('@/lib/db', () => ({
  db: {
    select: dbMock.select,
    insert: dbMock.insert,
    update: dbMock.update,
  },
}));

describe('oficios repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.setSelectResult([MOCK_RESULT]);
    dbMock.setInsertResult([MOCK_RESULT]);
    dbMock.setUpdateResult([MOCK_RESULT]);
  });

  describe('findOfficialLetters', () => {
    it('queries with default limit 100', async () => {
      const results = await findOfficialLetters();
      expect(results).toEqual([MOCK_RESULT]);
      expect(dbMock._selectChain.limit).toHaveBeenCalledWith(100);
    });

    it('queries with custom limit', async () => {
      await findOfficialLetters(undefined, { limit: 50 });
      expect(dbMock._selectChain.limit).toHaveBeenCalledWith(50);
    });

    it('filters by year when provided', async () => {
      await findOfficialLetters(2026);
      expect(dbMock._selectChain.where).toHaveBeenCalled();
    });
  });

  describe('findOfficialLetterById', () => {
    it('returns letter when found', async () => {
      dbMock.setSelectResult([MOCK_RESULT]);

      const result = await findOfficialLetterById(1);
      expect(result).toEqual(MOCK_RESULT);
    });

    it('returns null when not found', async () => {
      dbMock.setSelectResult([]);

      const result = await findOfficialLetterById(999);
      expect(result).toBeNull();
    });
  });

  describe('getLastSequenceForYear', () => {
    it('returns sequence when records exist', async () => {
      dbMock.setSelectResult([{ sequence: 5 }]);

      const result = await getLastSequenceForYear(2026);
      expect(result).toBe(5);
    });

    it('returns 0 when no records exist', async () => {
      dbMock.setSelectResult([]);

      const result = await getLastSequenceForYear(2025);
      expect(result).toBe(0);
    });
  });

  describe('createOfficialLetter', () => {
    it('inserts and returns the new letter', async () => {
      dbMock.setInsertResult([MOCK_RESULT]);

      const result = await createOfficialLetter(MOCK_RESULT as any);

      expect(result).toEqual(MOCK_RESULT);
      expect(dbMock.insert).toHaveBeenCalled();
    });
  });

  describe('cancelOfficialLetter', () => {
    it('sets status to cancelado and updates updatedBy', async () => {
      const cancelledResult = { ...MOCK_RESULT, status: 'cancelado', updatedBy: 2 };
      dbMock.setUpdateResult([cancelledResult]);

      const result = await cancelOfficialLetter(1, 2);
      expect(result).toEqual(cancelledResult);
      expect(dbMock._updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelado', updatedBy: 2 }),
      );
    });
  });
});
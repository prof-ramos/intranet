/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for self-referencing builders */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getAssociatesForReport } from './queries';

const { dbMock, MOCK_ASSOCIATE, loggerMock } = vi.hoisted(() => {
  const MOCK_ASSOCIATE = {
    id: 1,
    fullName: 'Test Associate',
    primaryEmail: 'test@example.com',
    secondaryEmail: null,
    birthDate: '1990-01-01',
    cpf: '12345678901',
    address: 'Brasília',
    locationCity: 'Brasília',
    locationCountry: 'Brasil',
    phone: '61999999999',
    whatsapp: null,
    siape: '1234567',
    assignment: 'SGP',
    assignmentStartDate: '2020-01-01',
    classPattern: 'A',
    functionalStatus: 'ativo',
    associationStatus: 'associado',
    contributionStatus: 'em_dia',
    joinedAt: '2020-01-01',
    associationCategory: 'efetivo',
  };

  let _selectResult: any[] = [MOCK_ASSOCIATE];

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

  const loggerMock = {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  return { dbMock, MOCK_ASSOCIATE, loggerMock };
});

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/logger', () => ({ createLogger: () => loggerMock }));

describe('reports queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.setSelectResult([MOCK_ASSOCIATE]);
  });

  describe('getAssociatesForReport', () => {
    it('returns associates with no filters', async () => {
      const results = await getAssociatesForReport();
      expect(results).toHaveLength(1);
      expect(results[0].fullName).toBe('Test Associate');
    });

    it('applies functionalStatus filter', async () => {
      await getAssociatesForReport({ functionalStatus: 'ativo' });
      expect(dbMock._selectChain.where).toHaveBeenCalled();
    });

    it('applies associationStatus filter', async () => {
      await getAssociatesForReport({ associationStatus: 'associado' });
      expect(dbMock._selectChain.where).toHaveBeenCalled();
    });

    it('applies contributionStatus filter', async () => {
      await getAssociatesForReport({ contributionStatus: 'em_dia' });
      expect(dbMock._selectChain.where).toHaveBeenCalled();
    });

    it('applies birthMonth filter', async () => {
      await getAssociatesForReport({ birthMonth: 5 });
      expect(dbMock._selectChain.where).toHaveBeenCalled();
    });

    it('applies multiple filters together', async () => {
      await getAssociatesForReport({
        functionalStatus: 'ativo',
        associationStatus: 'associado',
        contributionStatus: 'em_dia',
      });
      expect(dbMock._selectChain.where).toHaveBeenCalled();
    });

    it('returns empty array when no matches', async () => {
      dbMock.setSelectResult([]);
      const results = await getAssociatesForReport({ functionalStatus: 'aposentado' });
      expect(results).toHaveLength(0);
    });

    it('applies a bounded limit on the query', async () => {
      await getAssociatesForReport();
      // limit is called with limit+1 to detect truncation precisely
      expect(dbMock._selectChain.limit).toHaveBeenCalledWith(5001);
    });

    it('throws and logs a PII-free warning when result exceeds the cap', async () => {
      const overLimit = Array.from({ length: 6 }, (_, i) => ({
        ...MOCK_ASSOCIATE,
        id: i + 1,
      }));
      dbMock.setSelectResult(overLimit);

      await expect(getAssociatesForReport({}, 5)).rejects.toThrow(/excede o limite/);

      expect(loggerMock.warn).toHaveBeenCalledWith(
        expect.stringContaining('truncated'),
        expect.objectContaining({ count: 6, limit: 5, truncated: true }),
      );

      // Ensure the warning payload contains no PII fields
      const warnCall = loggerMock.warn.mock.calls[0];
      const payload = JSON.stringify(warnCall);
      expect(payload).not.toMatch(/cpf|siape|email|phone|whatsapp|address|birthDate/i);
    });
  });
});

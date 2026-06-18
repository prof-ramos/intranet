/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for self-referencing builders */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getAssociatesForReport } from './queries';

const { dbMock, MOCK_ASSOCIATE } = vi.hoisted(() => {
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
  selectChain.then = (resolve: any, reject: any) =>
    Promise.resolve(_selectResult).then(resolve, reject);

  const dbMock = {
    select: vi.fn().mockReturnValue(selectChain),
    _selectChain: selectChain,
    setSelectResult(val: any[]) {
      _selectResult = val;
    },
  };

  return { dbMock, MOCK_ASSOCIATE };
});

vi.mock('@/lib/db', () => ({ db: dbMock }));

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
  });
});

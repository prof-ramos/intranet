import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findAssociatesPaginated, findAssociateById, updateAssociateById } from './repository';

const { mockSelect, mockUpdate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
}));

type MockAssociateRow = {
  id: number;
  fullName: string;
  assignment: string | null;
  classPattern: string | null;
  primaryEmail?: string | null;
  primaryEmailCiphertext?: string | null;
  functionalStatus: string | null;
  associationStatus: string;
  contributionStatus: string | null;
};

type RowPredicate = (row: MockAssociateRow) => boolean;

let associateRows: MockAssociateRow[] = [];

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: (...args: unknown[]) => mockSelect(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  };
});

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...conditions: Array<RowPredicate | undefined>) => {
    const activeConditions = conditions.filter(Boolean) as RowPredicate[];
    return (row: MockAssociateRow) => activeConditions.every((condition) => condition(row));
  }),
  asc: vi.fn((column: unknown) => ({ op: 'asc', column })),
  count: vi.fn(() => ({ op: 'count' })),
  eq: vi.fn((column: keyof MockAssociateRow, value: unknown) => {
    return (row: MockAssociateRow) => row[column] === value;
  }),
  ilike: vi.fn((column: keyof MockAssociateRow, pattern: string) => {
    const textPattern = pattern
      .replace(/([.+^${}()|[\]\\])/g, '\\$1')
      .replace(/%/g, '.*')
      .replace(/_/g, '.');
    const regex = new RegExp(`^${textPattern}$`, 'i');
    return (row: MockAssociateRow) => regex.test(String(row[column] ?? ''));
  }),
}));

vi.mock('@/lib/db/schema', () => ({
  associates: {
    id: 'id',
    fullName: 'fullName',
    assignment: 'assignment',
    classPattern: 'classPattern',
    primaryEmail: 'primaryEmail',
    primaryEmailCiphertext: 'primaryEmailCiphertext',
    functionalStatus: 'functionalStatus',
    associationStatus: 'associationStatus',
    contributionStatus: 'contributionStatus',
  },
  functionalStatus: { enumValues: ['ativo', 'aposentado', 'cedido', 'em_licenca'] },
  associationStatus: { enumValues: ['ativo', 'inativo'] },
  contributionStatus: { enumValues: ['em_dia', 'inadimplente', 'pendente_migracao'] },
  activities: {
    id: 'id',
    title: 'title',
    status: 'status',
    dueDate: 'dueDate',
    associateId: 'associateId',
  },
}));

vi.mock('./search-params', () => ({
  buildAssociateNameSearchPattern: (q: string) => `%${q}%`,
}));

function listRowsQuery(rows: MockAssociateRow[]) {
  const query: Record<string, unknown> = {};
  query.from = vi.fn().mockReturnValue(query);
  query.where = vi.fn((predicate?: RowPredicate) => {
    query.filteredRows = predicate ? rows.filter(predicate) : rows;
    return query;
  });
  query.orderBy = vi.fn().mockReturnValue(query);
  query.limit = vi.fn().mockReturnValue(query);
  query.offset = vi.fn().mockImplementation(() => query.filteredRows ?? rows);
  return query;
}

function countQuery(rows: MockAssociateRow[]) {
  const query: Record<string, unknown> = {};
  query.from = vi.fn().mockReturnValue(query);
  query.where = vi.fn((predicate?: RowPredicate) => [
    { total: predicate ? rows.filter(predicate).length : rows.length },
  ]);
  return query;
}

function preparePaginatedQueries(rows: MockAssociateRow[]) {
  associateRows = rows;
  mockSelect.mockReset();
  mockSelect.mockReturnValueOnce(listRowsQuery(associateRows)).mockReturnValueOnce(countQuery(associateRows));
}

const officers = [
  {
    id: 1,
    fullName: 'Edson Diniz',
    assignment: null,
    classPattern: null,
    functionalStatus: 'ativo',
    associationStatus: 'ativo',
    contributionStatus: 'em_dia',
  },
  {
    id: 2,
    fullName: 'Paulo Edson Medeiros de Albuquerque',
    assignment: null,
    classPattern: null,
    functionalStatus: 'aposentado',
    associationStatus: 'inativo',
    contributionStatus: 'inadimplente',
  },
  {
    id: 3,
    fullName: 'Maria Oliveira',
    assignment: null,
    classPattern: null,
    functionalStatus: 'ativo',
    associationStatus: 'inativo',
    contributionStatus: 'em_dia',
  },
] satisfies MockAssociateRow[];

describe('associates repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preparePaginatedQueries(officers);
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  it('exports are defined', () => {
    expect(typeof findAssociatesPaginated).toBe('function');
    expect(typeof findAssociateById).toBe('function');
    expect(typeof updateAssociateById).toBe('function');
  });

  it('keeps the default list restricted to active ASOF associates when no search query is present', async () => {
    const result = await findAssociatesPaginated(1, 20);

    expect(result.total).toBe(1);
    expect(result.rows.map((row) => row.fullName)).toEqual(['Edson Diniz']);
  });

  it('searches any registered officer by name without restricting association status', async () => {
    const result = await findAssociatesPaginated(1, 20, ' Edson ');

    expect(result.total).toBe(2);
    expect(result.rows.map((row) => row.fullName)).toEqual([
      'Edson Diniz',
      'Paulo Edson Medeiros de Albuquerque',
    ]);
  });

  it('preserves explicit filters when searching by name', async () => {
    const result = await findAssociatesPaginated(1, 20, 'EDSON', {
      contributionStatus: 'inadimplente',
      functionalStatus: 'aposentado',
    });

    expect(result.total).toBe(1);
    expect(result.rows.map((row) => row.fullName)).toEqual(['Paulo Edson Medeiros de Albuquerque']);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findAssociatesPaginated, findAssociatesPaginatedCursor, findAssociateById, updateAssociateById } from './repository';

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
  sql: vi.fn((_strings: TemplateStringsArray, ...values: unknown[]) => {
    const sqlText = Array.from(_strings).join('');
    const patternValue = values.findLast((value) => typeof value === 'string' && value.includes('%'));

    if (!patternValue && sqlText.includes(' OR ')) {
      const cursorFullName = String(values[1] ?? '');
      const cursorId = Number(values[5] ?? 0);
      return (row: MockAssociateRow) => row.fullName > cursorFullName
        || (row.fullName === cursorFullName && row.id > cursorId);
    }

    const pattern = String(patternValue ?? '');
    const textPattern = pattern
      .replace(/([.+^${}()|[\]\\])/g, '\\$1')
      .replace(/\\%/g, '%')
      .replace(/\\_/g, '_')
      .replace(/%/g, '.*')
      .replace(/_/g, '.');
    const regex = new RegExp(`^${textPattern}$`, 'i');
    return (row: MockAssociateRow) => {
      const normalizedName = String(row.fullName ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      return regex.test(normalizedName);
    };
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
  associationStatus: { enumValues: ['associado', 'nao_associado'] },
  contributionStatus: { enumValues: ['em_dia', 'inadimplente'] },
  activities: {
    id: 'id',
    title: 'title',
    status: 'status',
    dueDate: 'dueDate',
    associateId: 'associateId',
  },
}));

vi.mock('@/lib/crypto/pii', () => ({
  decryptPiiField: vi.fn((_ciphertext: unknown, fallback: unknown) => fallback),
  piiBlindIndex: vi.fn((value: string) => `hash-${value}`),
}));

vi.mock('./search-params', () => ({
  buildAssociateNameSearchPattern: (q: string) => `%${q}%`,
  normalizeAssociateNameForSearch: (raw: string) => raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
  normalizeCpfForSearch: (raw: string) => raw.replace(/\D/g, ''),
  normalizeSiapeForSearch: (raw: string) => raw.replace(/\D/g, ''),
}));

function listRowsQuery(rows: MockAssociateRow[]) {
  const query: Record<string, unknown> & PromiseLike<MockAssociateRow[]> = {
    then(onfulfilled) {
      return Promise.resolve((query.filteredRows as MockAssociateRow[]) ?? rows).then(onfulfilled);
    },
  };
  query.from = vi.fn().mockReturnValue(query);
  query.where = vi.fn((predicate?: RowPredicate) => {
    query.filteredRows = predicate ? rows.filter(predicate) : rows;
    return query;
  });
  query.orderBy = vi.fn().mockImplementation(() => {
    query.filteredRows = [...((query.filteredRows as MockAssociateRow[]) ?? rows)].sort((left, right) => {
      const byName = left.fullName.localeCompare(right.fullName, 'pt-BR');
      return byName === 0 ? left.id - right.id : byName;
    });
    return query;
  });
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

function prepareCursorQuery(rows: MockAssociateRow[]) {
  associateRows = rows;
  mockSelect.mockReset();
  mockSelect.mockReturnValueOnce(listRowsQuery(associateRows));
}

const officers = [
  {
    id: 1,
    fullName: 'Edson Diniz',
    assignment: null,
    classPattern: null,
    functionalStatus: 'ativo',
    associationStatus: 'associado',
    contributionStatus: 'em_dia',
  },
  {
    id: 2,
    fullName: 'Paulo Edson Medeiros de Albuquerque',
    assignment: null,
    classPattern: null,
    functionalStatus: 'aposentado',
    associationStatus: 'nao_associado',
    contributionStatus: 'inadimplente',
  },
  {
    id: 3,
    fullName: 'João Oliveira',
    assignment: null,
    classPattern: null,
    functionalStatus: 'ativo',
    associationStatus: 'nao_associado',
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

  it('returns all associates when no association status filter is present', async () => {
    const result = await findAssociatesPaginated(1, 20);

    expect(result.total).toBe(3);
    expect(result.rows.map((row) => row.fullName)).toEqual([
      'Edson Diniz',
      'João Oliveira',
      'Paulo Edson Medeiros de Albuquerque',
    ]);
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

  it('searches names without requiring accents', async () => {
    const result = await findAssociatesPaginated(1, 20, 'joao');

    expect(result.total).toBe(1);
    expect(result.rows.map((row) => row.fullName)).toEqual(['João Oliveira']);
  });
});

describe('findAssociatesPaginatedCursor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns first page with nextCursor when more rows exist', async () => {
    prepareCursorQuery(officers);
    const result = await findAssociatesPaginatedCursor(2, null, undefined, undefined, 'name');

    expect(result.rows).toHaveLength(2);
    expect(result.nextCursor).not.toBeNull();
    expect(typeof result.nextCursor).toBe('string');
  });

  it('returns empty page when no rows match', async () => {
    prepareCursorQuery([]);
    const result = await findAssociatesPaginatedCursor(20, null, 'NOMENAOEXISTE', undefined, 'name');

    expect(result.rows).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it('returns all rows when total fits in one page', async () => {
    prepareCursorQuery(officers);
    const result = await findAssociatesPaginatedCursor(20, null, undefined, undefined, 'name');

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBeNull();
  });

  it('resumes from cursor for subsequent page', async () => {
    prepareCursorQuery(officers);
    const first = await findAssociatesPaginatedCursor(2, null, undefined, undefined, 'name');
    expect(first.rows).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();

    prepareCursorQuery(officers);
    const second = await findAssociatesPaginatedCursor(2, first.nextCursor!, undefined, undefined, 'name');
    expect(second.rows).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
  });

  it('performs exact CPF lookup and ignores cursor', async () => {
    prepareCursorQuery(officers);
    const result = await findAssociatesPaginatedCursor(20, null, '123.456.789-00', undefined, 'cpf');

    expect(result.rows).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it('performs exact SIAPE lookup and ignores cursor', async () => {
    prepareCursorQuery(officers);
    const result = await findAssociatesPaginatedCursor(20, null, '99999', undefined, 'siape');

    expect(result.rows).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it('returns empty for CPF search with empty digits', async () => {
    prepareCursorQuery(officers);
    const result = await findAssociatesPaginatedCursor(20, null, 'abc', undefined, 'cpf');

    expect(result.rows).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markOverdueTriages, countTriagesByStatus, normalizeTriagesPagination } from './repository';

vi.mock('@/lib/db', () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
        }),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 42 }]),
      }),
    }),
  },
}));

describe('markOverdueTriages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks overdue triages and returns count', async () => {
    const count = await markOverdueTriages();
    expect(count).toBe(2);
  });
});

describe('countTriagesByStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the correct count of triages by status', async () => {
    const count = await countTriagesByStatus('novo');
    expect(count).toBe(42);
  });
});

describe('normalizeTriagesPagination', () => {
  it('returns valid page and pageSize when both are positive integers', () => {
    expect(normalizeTriagesPagination(2, 50)).toEqual({ page: 2, pageSize: 50 });
  });

  it('defaults to page 1 if page is not a positive integer', () => {
    expect(normalizeTriagesPagination(0, 50)).toEqual({ page: 1, pageSize: 50 });
    expect(normalizeTriagesPagination(-1, 50)).toEqual({ page: 1, pageSize: 50 });
    expect(normalizeTriagesPagination(1.5, 50)).toEqual({ page: 1, pageSize: 50 });
  });

  it('defaults to default pageSize (20) if pageSize is not a positive integer', () => {
    expect(normalizeTriagesPagination(2, 0)).toEqual({ page: 2, pageSize: 20 });
    expect(normalizeTriagesPagination(2, -10)).toEqual({ page: 2, pageSize: 20 });
    expect(normalizeTriagesPagination(2, 5.5)).toEqual({ page: 2, pageSize: 20 });
  });

  it('handles maximum pageSize boundary from global default', () => {
    expect(normalizeTriagesPagination(1, 150)).toEqual({ page: 1, pageSize: 100 });
  });
});

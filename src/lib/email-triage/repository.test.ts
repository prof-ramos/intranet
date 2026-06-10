import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markOverdueTriages, countTriagesByStatus } from './repository';

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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markOverdueTriages } from './repository';

vi.mock('@/lib/db', () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
        }),
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

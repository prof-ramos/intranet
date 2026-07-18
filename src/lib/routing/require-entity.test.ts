import { describe, expect, it, vi, beforeEach } from 'vitest';
import { requireEntityById } from './require-entity';
import { notFound } from 'next/navigation';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

describe('requireEntityById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws and calls notFound when id is null', async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: 1 });
    await expect(requireEntityById(null, fetcher)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('throws and calls notFound when fetcher returns null', async () => {
    const fetcher = vi.fn().mockResolvedValue(null);
    await expect(requireEntityById(1, fetcher)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledWith(1);
  });

  it('returns the entity when found', async () => {
    const entity = { id: 1, name: 'Test' };
    const fetcher = vi.fn().mockResolvedValue(entity);
    const result = await requireEntityById(1, fetcher);
    expect(result).toBe(entity);
    expect(notFound).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledWith(1);
  });
});

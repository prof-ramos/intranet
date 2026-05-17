import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMocks = vi.hoisted(() => ({
  countConsultationsByStatus: vi.fn(),
  countConsultationsStale: vi.fn(),
  countConsultationsSlaDueSoon: vi.fn(),
  countConsultationsRespondedThisMonth: vi.fn(),
  getConsultationById: vi.fn(),
  getNotesByEntity: vi.fn(),
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock('./repository', () => ({
  countConsultationsByStatus: repositoryMocks.countConsultationsByStatus,
  countConsultationsStale: repositoryMocks.countConsultationsStale,
  countConsultationsSlaDueSoon: repositoryMocks.countConsultationsSlaDueSoon,
  countConsultationsRespondedThisMonth: repositoryMocks.countConsultationsRespondedThisMonth,
  getConsultationById: repositoryMocks.getConsultationById,
  getNotesByEntity: repositoryMocks.getNotesByEntity,
}));

import { countConsultationsSlaDueSoon } from './queries';

describe('juridico queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMocks.countConsultationsSlaDueSoon.mockResolvedValue(3);
  });

  it('forwards the default due-soon window to the repository', async () => {
    const result = await countConsultationsSlaDueSoon();

    expect(result).toBe(3);
    expect(repositoryMocks.countConsultationsSlaDueSoon).toHaveBeenCalledWith(2);
  });

  it('accepts a custom due-soon window', async () => {
    await countConsultationsSlaDueSoon(5);

    expect(repositoryMocks.countConsultationsSlaDueSoon).toHaveBeenCalledWith(5);
  });
});

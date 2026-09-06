import { beforeEach, describe, expect, it, vi } from 'vitest';

const unstableCacheCalls = vi.hoisted(
  () => [] as Array<{ key: string[]; options?: { revalidate?: number; tags?: string[] } }>,
);

const repositoryMocks = vi.hoisted(() => ({
  countConsultationsByStatus: vi.fn(),
  countConsultationsStale: vi.fn(),
  countConsultationsSlaDueSoon: vi.fn(),
  countConsultationsRespondedThisMonth: vi.fn(),
  getConsultationById: vi.fn(),
  getNotesByEntity: vi.fn(),
}));

vi.mock('next/cache', () => ({
  unstable_cache: (
    fn: (...args: unknown[]) => unknown,
    key: string[],
    options?: { revalidate?: number; tags?: string[] },
  ) => {
    unstableCacheCalls.push({ key, options });
    return fn;
  },
}));

vi.mock('./repository', () => ({
  countConsultationsByStatus: repositoryMocks.countConsultationsByStatus,
  countConsultationsStale: repositoryMocks.countConsultationsStale,
  countConsultationsSlaDueSoon: repositoryMocks.countConsultationsSlaDueSoon,
  countConsultationsRespondedThisMonth: repositoryMocks.countConsultationsRespondedThisMonth,
  getConsultationById: repositoryMocks.getConsultationById,
  getNotesByEntity: repositoryMocks.getNotesByEntity,
}));

import {
  countConsultationsByStatus,
  countConsultationsRespondedThisMonth,
  countConsultationsSlaDueSoon,
  countConsultationsStale,
  getConsultationById,
  getNotesByEntity,
} from './queries';

describe('juridico queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    unstableCacheCalls.length = 0;
    repositoryMocks.countConsultationsSlaDueSoon.mockResolvedValue(3);
  });

  it('uses separate summary, detail, and notes cache tags', async () => {
    await countConsultationsByStatus('aberta');
    await countConsultationsStale(8);
    await countConsultationsSlaDueSoon(3);
    await countConsultationsRespondedThisMonth();
    await getConsultationById(17);
    await getNotesByEntity('consultation', 17);

    const tagsByKey = Object.fromEntries(
      unstableCacheCalls.map(({ key, options }) => [key[0], options?.tags]),
    );

    expect(tagsByKey['consultations-count-by-status']).toEqual(['legal:summary']);
    expect(tagsByKey['consultations-stale-count']).toEqual(['legal:summary']);
    expect(tagsByKey['consultations-sla-due-soon']).toEqual(['legal:summary']);
    expect(tagsByKey['consultations-responded-month']).toEqual(['legal:summary']);
    expect(tagsByKey['consultation-detail']).toEqual(['legal:consultation-detail']);
    expect(tagsByKey['legal-notes']).toEqual(['legal:notes']);
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

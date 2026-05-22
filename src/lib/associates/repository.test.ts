import { describe, it, expect, vi } from 'vitest';
import { findAssociatesPaginated, findAssociateById, updateAssociateById } from './repository';

vi.mock('@/lib/db', () => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    c.from = vi.fn().mockReturnValue(c);
    c.where = vi.fn().mockReturnValue(c);
    c.orderBy = vi.fn().mockReturnValue(c);
    c.limit = vi.fn().mockReturnValue(c);
    c.offset = vi.fn().mockResolvedValue([]);
    return c;
  };

  return {
    db: {
      select: vi.fn().mockReturnValue(chain()),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    },
  };
});

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
  },
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

describe('repository module loads without runtime errors', () => {
  it('exports are defined', () => {
    expect(typeof findAssociatesPaginated).toBe('function');
    expect(typeof findAssociateById).toBe('function');
    expect(typeof updateAssociateById).toBe('function');
  });
});

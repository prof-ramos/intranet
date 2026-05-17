import { describe, expect, it } from 'vitest';

import { normalizeConsultationsPagination } from './repository';

describe('juridico repository', () => {
  it('normalizes invalid pagination values to safe defaults', () => {
    expect(normalizeConsultationsPagination(0, 0)).toEqual({ page: 1, pageSize: 20 });
    expect(normalizeConsultationsPagination(-3, -10)).toEqual({ page: 1, pageSize: 20 });
    expect(normalizeConsultationsPagination(Number.NaN, Number.NaN)).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it('preserves valid positive integer pagination values', () => {
    expect(normalizeConsultationsPagination(3, 50)).toEqual({ page: 3, pageSize: 50 });
  });
});

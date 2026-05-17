import { describe, expect, it } from 'vitest';
import { parseAuditSearchParams } from './search-params';

describe('audit search params', () => {
  it('returns defaults for empty input', () => {
    expect(parseAuditSearchParams({})).toEqual({
      page: 1,
      entityType: '',
      q: '',
      de: '',
      ate: '',
    });
  });

  it('parses valid params and trims q', () => {
    expect(
      parseAuditSearchParams({
        page: '3',
        tipo: 'activity',
        q: '  status atualizado  ',
        de: '2026-05-01',
        ate: '2026-05-31',
      }),
    ).toEqual({
      page: 3,
      entityType: 'activity',
      q: 'status atualizado',
      de: '2026-05-01',
      ate: '2026-05-31',
    });
  });

  it('falls back safely on invalid page, type, and dates', () => {
    expect(
      parseAuditSearchParams({
        page: '999x',
        tipo: 'invalido',
        de: '2026-13-01',
        ate: '2026-02-30',
      }),
    ).toEqual({
      page: 1,
      entityType: '',
      q: '',
      de: '',
      ate: '',
    });
  });
});

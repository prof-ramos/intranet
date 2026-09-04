import { describe, expect, it } from 'vitest';
import { encodeAuditCursor, parseAuditCursor, parseAuditSearchParams } from './search-params';

describe('audit search params', () => {
  it('returns defaults for empty input', () => {
    expect(parseAuditSearchParams({})).toEqual({
      page: 1,
      cursor: '',
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
        cursor: '1717200000000_42',
      }),
    ).toEqual({
      page: 3,
      cursor: '1717200000000_42',
      entityType: 'activity',
      q: 'status atualizado',
      de: '2026-05-01',
      ate: '2026-05-31',
    });
  });

  it('falls back safely on invalid page, type, dates, and cursor', () => {
    expect(
      parseAuditSearchParams({
        page: '999x',
        tipo: 'invalido',
        de: '2026-13-01',
        ate: '2026-02-30',
        cursor: 'not-a-cursor',
      }),
    ).toEqual({
      page: 1,
      cursor: '',
      entityType: '',
      q: '',
      de: '',
      ate: '',
    });
  });

  it('encodes and parses keyset cursors', () => {
    const createdAt = new Date('2026-05-01T12:00:00.000Z');
    const encoded = encodeAuditCursor(createdAt, 99);
    expect(parseAuditCursor(encoded)).toEqual({ createdAt, id: 99 });
  });
});

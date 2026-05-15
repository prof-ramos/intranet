import { describe, it, expect } from 'vitest';
import {
  parseMonthlyPaymentsSearchParams,
  buildMonthlyPaymentsSearchParams,
  buildAssociateNameSearchPattern,
} from './search-params';

describe('parseMonthlyPaymentsSearchParams', () => {
  it('returns defaults for empty input', () => {
    const result = parseMonthlyPaymentsSearchParams({});
    expect(result.q).toBe('');
    expect(result.page).toBe(1);
    expect(result.status).toBeUndefined();
    expect(result.method).toBeUndefined();
    expect(result.location).toBeUndefined();
  });

  it('trims and truncates query to 80 chars', () => {
    const longQuery = 'a'.repeat(100);
    const result = parseMonthlyPaymentsSearchParams({ q: `  ${longQuery}  ` });
    expect(result.q.length).toBeLessThanOrEqual(80);
    expect(result.q).toBe(longQuery.slice(0, 80));
  });

  it('parses valid status, method, location', () => {
    const result = parseMonthlyPaymentsSearchParams({
      q: 'test',
      status: 'pago',
      method: 'folha',
      location: 'brasil',
      page: '2',
    });
    expect(result.q).toBe('test');
    expect(result.status).toBe('pago');
    expect(result.method).toBe('folha');
    expect(result.location).toBe('brasil');
    expect(result.page).toBe(2);
  });

  it('falls back to page 1 for invalid input', () => {
    const result = parseMonthlyPaymentsSearchParams({
      q: '',
      page: 'abc',
    });
    expect(result.page).toBe(1);
  });

  it('rejects invalid enum values via Zod schema', () => {
    const result = parseMonthlyPaymentsSearchParams({
      q: '',
      status: 'invalid_status',
    });
    expect(result.status).toBeUndefined();
  });

  it('handles missing optional fields', () => {
    const result = parseMonthlyPaymentsSearchParams({ q: 'search' });
    expect(result.q).toBe('search');
    expect(result.status).toBeUndefined();
    expect(result.method).toBeUndefined();
    expect(result.location).toBeUndefined();
  });
});

describe('buildMonthlyPaymentsSearchParams', () => {
  it('omits empty/default values', () => {
    const result = buildMonthlyPaymentsSearchParams(
      { q: '', page: 1, status: undefined, method: undefined, location: undefined },
      {},
    );
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('includes page only when > 1', () => {
    const result1 = buildMonthlyPaymentsSearchParams(
      { q: '', page: 1 },
      { page: 1 },
    );
    expect(result1.page).toBeUndefined();

    const result2 = buildMonthlyPaymentsSearchParams(
      { q: '', page: 1 },
      { page: 3 },
    );
    expect(result2.page).toBe('3');
  });

  it('preserves page from current when updates do not override it', () => {
    const result = buildMonthlyPaymentsSearchParams(
      { q: '', page: 3, status: 'pago' },
      {},
    );
    expect(result.page).toBe('3');
    expect(result.q).toBeUndefined();
  });

  it('includes all non-empty params', () => {
    const result = buildMonthlyPaymentsSearchParams(
      { q: 'test', page: 1, status: 'pago', method: 'folha', location: 'brasil' },
      {},
    );
    expect(result.q).toBe('test');
    expect(result.status).toBe('pago');
    expect(result.method).toBe('folha');
    expect(result.location).toBe('brasil');
  });
});

describe('buildAssociateNameSearchPattern', () => {
  it('wraps query with LIKE wildcards', () => {
    expect(buildAssociateNameSearchPattern('silva')).toBe('%silva%');
  });

  it('escapes special LIKE characters', () => {
    expect(buildAssociateNameSearchPattern('100%')).toBe('%100\\%%');
    expect(buildAssociateNameSearchPattern('a_b')).toBe('%a\\_b%');
  });

  it('handles empty query', () => {
    expect(buildAssociateNameSearchPattern('')).toBe('%%');
  });
});
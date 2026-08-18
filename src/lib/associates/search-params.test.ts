import { describe, expect, it } from 'vitest';
import {
  buildAssociatesSearchParams,
  buildAssociateNameSearchPattern,
  parseAssociatesSearchParams,
  normalizeCpfForSearch,
  normalizeSiapeForSearch,
} from '@/lib/associates/search-params';

describe('associates search params', () => {
  it('normalizes invalid page values to page 1', () => {
    expect(parseAssociatesSearchParams({ page: 'abc' })).toEqual({
      q: '',
      page: 1,
      searchBy: 'name',
    });
    expect(parseAssociatesSearchParams({ page: '-3' })).toEqual({
      q: '',
      page: 1,
      searchBy: 'name',
    });
    expect(parseAssociatesSearchParams({ page: '0' })).toEqual({
      q: '',
      page: 1,
      searchBy: 'name',
    });
    expect(parseAssociatesSearchParams({ page: '2.5' })).toEqual({
      q: '',
      page: 1,
      searchBy: 'name',
    });
  });

  it('trims and limits search text', () => {
    const longQuery = `  ${'a'.repeat(90)}  `;

    expect(parseAssociatesSearchParams({ q: longQuery, page: '3' })).toEqual({
      q: 'a'.repeat(80),
      page: 3,
      searchBy: 'name',
    });
  });

  it('parses searchBy parameter', () => {
    expect(parseAssociatesSearchParams({ q: '123', searchBy: 'cpf' })).toEqual({
      q: '123',
      page: 1,
      searchBy: 'cpf',
    });
    expect(parseAssociatesSearchParams({ q: '456', searchBy: 'siape' })).toEqual({
      q: '456',
      page: 1,
      searchBy: 'siape',
    });
  });

  it('defaults searchBy to name', () => {
    expect(parseAssociatesSearchParams({ q: 'test' }).searchBy).toBe('name');
  });

  it('preserves dashboard list filters including geographic scope', () => {
    const parsed = parseAssociatesSearchParams({
      associationStatus: 'associado',
      contributionStatus: 'em_dia',
      location: 'exterior',
    });

    expect(parsed).toEqual({
      q: '',
      page: 1,
      searchBy: 'name',
      associationStatus: 'associado',
      contributionStatus: 'em_dia',
      location: 'exterior',
    });
    expect(buildAssociatesSearchParams(parsed, {})).toEqual({
      associationStatus: 'associado',
      contributionStatus: 'em_dia',
      location: 'exterior',
    });
  });

  it('escapes wildcard characters for LIKE searches', () => {
    expect(buildAssociateNameSearchPattern('Ana_%\\Silva')).toBe('%Ana\\_\\%\\\\Silva%');
  });

  it('normalizes CPF for search', () => {
    expect(normalizeCpfForSearch('123.456.789-00')).toBe('12345678900');
    expect(normalizeCpfForSearch('12345678900')).toBe('12345678900');
    expect(normalizeCpfForSearch(' 123.456.789-00 ')).toBe('12345678900');
  });

  it('normalizes SIAPE for search', () => {
    expect(normalizeSiapeForSearch('1234567')).toBe('1234567');
    expect(normalizeSiapeForSearch('1.234.567')).toBe('1234567');
  });
});

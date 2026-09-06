import { describe, expect, it } from 'vitest';
import {
  buildAssociatesSearchParams,
  buildAssociateNameSearchPattern,
  parseAssociatesSearchParams,
  normalizeCpfForSearch,
  normalizeSiapeForSearch,
} from '@/lib/associates/search-params';
import {
  associateSearchHelp,
  associateSearchPlaceholder,
  isAssociateSearchReady,
} from '@/lib/associates/search-params.shared';

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

  it('treats name search as ready from two characters', () => {
    expect(isAssociateSearchReady('A', 'name')).toBe(false);
    expect(isAssociateSearchReady('An', 'name')).toBe(true);
    expect(isAssociateSearchReady('  An  ', 'name')).toBe(true);
  });

  it('treats CPF search as ready only with 11 digits', () => {
    expect(isAssociateSearchReady('123.456.789-0', 'cpf')).toBe(false);
    expect(isAssociateSearchReady('123.456.789-00', 'cpf')).toBe(true);
    expect(isAssociateSearchReady('12345678900', 'cpf')).toBe(true);
  });

  it('treats SIAPE search as ready with a complete-looking digit sequence', () => {
    expect(isAssociateSearchReady('1234', 'siape')).toBe(false);
    expect(isAssociateSearchReady('12345', 'siape')).toBe(true);
    expect(isAssociateSearchReady('DEV0000001', 'siape')).toBe(true);
  });

  it('exposes mode-specific placeholder and help copy', () => {
    expect(associateSearchPlaceholder('name')).toMatch(/nome/i);
    expect(associateSearchPlaceholder('cpf')).toMatch(/000\.000\.000-00/);
    expect(associateSearchPlaceholder('siape')).toMatch(/SIAPE/i);
    expect(associateSearchHelp('name')).toMatch(/2 caracteres/);
    expect(associateSearchHelp('cpf')).toMatch(/CPF completo/);
    expect(associateSearchHelp('siape')).toMatch(/SIAPE completa/);
  });
});

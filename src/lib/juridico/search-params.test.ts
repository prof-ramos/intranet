import { describe, expect, it } from 'vitest';
import { parseJuridicoConsultationsSearchParams } from './search-params';

describe('juridico search params', () => {
  it('returns defaults for empty input', () => {
    expect(parseJuridicoConsultationsSearchParams({})).toEqual({ q: '', page: 1 });
  });

  it('parses and trims valid params', () => {
    expect(
      parseJuridicoConsultationsSearchParams({
        q: '  consulta urgente  ',
        status: 'respondida',
        page: '3',
      }),
    ).toEqual({
      q: 'consulta urgente',
      status: 'respondida',
      page: 3,
    });
  });

  it('falls back safely when status is invalid', () => {
    expect(
      parseJuridicoConsultationsSearchParams({
        q: 'teste',
        status: 'invalido',
        page: '2',
      }),
    ).toEqual({
      q: '',
      page: 1,
    });
  });
});

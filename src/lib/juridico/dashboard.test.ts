import { describe, expect, it } from 'vitest';
import { buildJuridicoStatusSummary } from './dashboard';

describe('juridico/dashboard', () => {
  it('returns real totals for every status, including archived', () => {
    expect(
      buildJuridicoStatusSummary({
        aberta: 4,
        aguardando_escritorio: 3,
        respondida: 7,
        arquivada: 2,
      }),
    ).toEqual({
      aberta: 4,
      aguardando_escritorio: 3,
      respondida: 7,
      arquivada: 2,
    });
  });
});

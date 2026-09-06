import { describe, expect, it } from 'vitest';
import { describeMailingFilters } from './filter-labels';

describe('describeMailingFilters', () => {
  it('traduz filtros conhecidos', () => {
    expect(
      describeMailingFilters({
        associationStatus: 'nao_associado',
        functionalStatus: 'aposentado',
        location: 'exterior',
        associationCategory: 'efetivo',
        assignment: 'SERE',
      }),
    ).toEqual([
      { label: 'Vínculo ASOF', value: 'Não associado' },
      { label: 'Situação funcional', value: 'Aposentado' },
      { label: 'Localização', value: 'Exterior' },
      { label: 'Categoria', value: 'efetivo' },
      { label: 'Lotação', value: 'SERE' },
    ]);
  });

  it('retorna vazio sem filtros', () => {
    expect(describeMailingFilters({})).toEqual([]);
  });
});

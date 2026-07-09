import { describe, expect, it } from 'vitest';
import { pairDependentsFromForm, toJoinedAtTimestamp } from './form-helpers';

describe('pairDependentsFromForm', () => {
  it('pairs multi-value form fields and skips fully empty rows', () => {
    const deps = pairDependentsFromForm({
      dependentName: ['Ana', '', 'Bruno'],
      dependentRelationship: ['cônjuge', '', 'filho(a)'],
    });
    expect(deps).toEqual([
      { name: 'Ana', relationship: 'cônjuge' },
      { name: 'Bruno', relationship: 'filho(a)' },
    ]);
  });

  it('supports single scalar values', () => {
    expect(
      pairDependentsFromForm({
        dependentName: 'Maria',
        dependentRelationship: 'cônjuge',
      }),
    ).toEqual([{ name: 'Maria', relationship: 'cônjuge' }]);
  });

  it('throws when a row has only name or only relationship', () => {
    expect(() =>
      pairDependentsFromForm({
        dependentName: ['Ana', 'Bruno'],
        dependentRelationship: ['cônjuge', ''],
      }),
    ).toThrow(/nome e parentesco/i);
  });
});

describe('toJoinedAtTimestamp', () => {
  it('converts date-only to UTC midnight ISO', () => {
    expect(toJoinedAtTimestamp('2015-03-10')).toBe('2015-03-10T00:00:00Z');
  });

  it('passes through empty as null', () => {
    expect(toJoinedAtTimestamp('')).toBeNull();
    expect(toJoinedAtTimestamp(null)).toBeNull();
  });

  it('passes through already-ISO timestamps', () => {
    expect(toJoinedAtTimestamp('2015-03-10T00:00:00Z')).toBe('2015-03-10T00:00:00Z');
  });
});

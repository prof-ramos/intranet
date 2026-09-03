import { describe, expect, it } from 'vitest';
import { splitContactName } from './name-split';

describe('splitContactName', () => {
  it('maps full name to first and last tokens, dropping middle names', () => {
    expect(splitContactName('Adalardo Nunciato Santiago')).toEqual({
      name: 'Adalardo Nunciato Santiago',
      firstName: 'Adalardo',
      lastName: 'Santiago',
    });
    expect(splitContactName('Adriana Cardoso dos Santos Stéphan')).toEqual({
      name: 'Adriana Cardoso dos Santos Stéphan',
      firstName: 'Adriana',
      lastName: 'Stéphan',
    });
  });

  it('handles two-token names', () => {
    expect(splitContactName('Adriana Cardoso')).toEqual({
      name: 'Adriana Cardoso',
      firstName: 'Adriana',
      lastName: 'Cardoso',
    });
  });

  it('keeps a single token as first name with empty last name', () => {
    expect(splitContactName('Madonna')).toEqual({
      name: 'Madonna',
      firstName: 'Madonna',
      lastName: '',
    });
  });

  it('normalizes whitespace and empty input', () => {
    expect(splitContactName('  Ana   Maria   Silva  ')).toEqual({
      name: 'Ana Maria Silva',
      firstName: 'Ana',
      lastName: 'Silva',
    });
    expect(splitContactName(null)).toEqual({ name: '', firstName: '', lastName: '' });
    expect(splitContactName('   ')).toEqual({ name: '', firstName: '', lastName: '' });
  });
});

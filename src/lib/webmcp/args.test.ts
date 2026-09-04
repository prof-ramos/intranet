import { describe, expect, it } from 'vitest';
import { optionalPositiveInt, optionalString, requiredPositiveInt, requiredString } from './args';
import { objectToFormData } from './form-data';

describe('webmcp args', () => {
  it('parses positive integers and rejects invalid values', () => {
    expect(requiredPositiveInt(12, 'ID')).toBe(12);
    expect(requiredPositiveInt('8', 'ID')).toBe(8);
    expect(() => requiredPositiveInt(0, 'ID')).toThrow('ID inválido.');
    expect(optionalPositiveInt('', 'Página')).toBeUndefined();
  });

  it('trims required strings', () => {
    expect(requiredString('  Ana  ', 'Nome')).toBe('Ana');
    expect(() => requiredString('   ', 'Nome')).toThrow('Nome é obrigatório.');
    expect(optionalString('  ')).toBeUndefined();
  });
});

describe('objectToFormData', () => {
  it('skips nullish values and stringifies the rest', () => {
    const formData = objectToFormData({
      associateId: 9,
      name: 'João',
      relationship: undefined,
      endDate: null,
    });

    expect(formData.get('associateId')).toBe('9');
    expect(formData.get('name')).toBe('João');
    expect(formData.get('relationship')).toBeNull();
    expect(formData.get('endDate')).toBeNull();
  });
});

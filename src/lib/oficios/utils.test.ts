import { describe, it, expect } from 'vitest';
import { cleanSignatoryName } from './utils';

describe('cleanSignatoryName', () => {
  it('removes cargo after em dash', () => {
    expect(cleanSignatoryName('João Silva — Presidente')).toBe('João Silva');
  });

  it('removes cargo after hyphen', () => {
    expect(cleanSignatoryName('Maria - VP')).toBe('Maria');
  });

  it('removes cargo after en dash', () => {
    expect(cleanSignatoryName('José Santos – Diretor')).toBe('José Santos');
  });

  it('returns full name when no separator', () => {
    expect(cleanSignatoryName('João')).toBe('João');
  });

  it('handles multiple separators', () => {
    expect(cleanSignatoryName('Ana — — Teste')).toBe('Ana');
  });

  it('trims whitespace', () => {
    expect(cleanSignatoryName('  João Silva  ')).toBe('João Silva');
  });
});

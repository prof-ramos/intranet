import { describe, expect, it } from 'vitest';
import { initialsFromName } from '@/lib/utils/initials';

describe('initialsFromName', () => {
  it('extracts first letter of first two name parts', () => {
    expect(initialsFromName('João Silva')).toBe('JS');
    expect(initialsFromName('Maria Oliveira Santos')).toBe('MO');
  });

  it('returns single initial for single name', () => {
    expect(initialsFromName('Pedro')).toBe('P');
  });

  it('handles null and undefined', () => {
    expect(initialsFromName(null)).toBe('');
    expect(initialsFromName(undefined)).toBe('');
  });

  it('handles empty and whitespace strings', () => {
    expect(initialsFromName('')).toBe('');
    expect(initialsFromName('   ')).toBe('');
  });

  it('uppercase the result', () => {
    expect(initialsFromName('joão silva')).toBe('JS');
  });
});

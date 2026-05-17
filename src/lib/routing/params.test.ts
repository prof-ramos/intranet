import { describe, expect, it } from 'vitest';
import { parsePositiveIntParam } from './params';

describe('parsePositiveIntParam', () => {
  it('parses positive decimal integers', () => {
    expect(parsePositiveIntParam('1')).toBe(1);
    expect(parsePositiveIntParam('42')).toBe(42);
  });

  it('rejects zero, negative, and empty values', () => {
    expect(parsePositiveIntParam('0')).toBeNull();
    expect(parsePositiveIntParam('-1')).toBeNull();
    expect(parsePositiveIntParam('')).toBeNull();
  });

  it('rejects non-decimal encodings and non-numeric text', () => {
    expect(parsePositiveIntParam('1e2')).toBeNull();
    expect(parsePositiveIntParam('0x10')).toBeNull();
    expect(parsePositiveIntParam('abc')).toBeNull();
    expect(parsePositiveIntParam('12.5')).toBeNull();
  });
});

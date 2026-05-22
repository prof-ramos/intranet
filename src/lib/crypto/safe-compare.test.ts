import { describe, it, expect } from 'vitest';
import { safeCompare } from './safe-compare';

describe('safeCompare', () => {
  it('returns true for identical strings', () => {
    expect(safeCompare('hello', 'hello')).toBe(true);
    expect(safeCompare('', '')).toBe(true);
    expect(safeCompare('a', 'a')).toBe(true);
  });

  it('returns false for different strings of same length', () => {
    expect(safeCompare('hello', 'world')).toBe(false);
    expect(safeCompare('abc', 'abd')).toBe(false);
  });

  it('returns false for different strings of different lengths', () => {
    expect(safeCompare('hello', 'hi')).toBe(false);
    expect(safeCompare('short', 'much-longer-string')).toBe(false);
  });

  it('returns false when expected is empty and actual is not', () => {
    expect(safeCompare('', 'something')).toBe(false);
  });

  it('returns false when actual is empty and expected is not', () => {
    expect(safeCompare('something', '')).toBe(false);
  });

  it('handles unicode strings correctly', () => {
    expect(safeCompare('coração', 'coração')).toBe(true);
    expect(safeCompare('café', 'naïve')).toBe(false);
    expect(safeCompare('日本語', '日本語')).toBe(true);
    expect(safeCompare('日本語', '中文')).toBe(false);
  });

  it('handles strings with special characters', () => {
    expect(safeCompare('a=b+c@d', 'a=b+c@d')).toBe(true);
    expect(safeCompare('key-with-dashes', 'key-with-dashes')).toBe(true);
  });

  it('does not short-circuit on early mismatch: strings differing only in last char', () => {
    // Both produce the same result type (boolean) regardless of where they differ
    const result1 = safeCompare('ab', 'ab');
    const result2 = safeCompare('ab', 'cd');
    expect(result1).toBe(true);
    expect(result2).toBe(false);

    // Strings that match in prefix but differ at end
    const result3 = safeCompare('abcdef', 'abcdeX');
    const result4 = safeCompare('abcdef', 'Xbcdef');
    expect(result3).toBe(false);
    expect(result4).toBe(false);
  });
});

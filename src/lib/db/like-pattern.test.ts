import { describe, it, expect } from 'vitest';
import { escapeLikePattern } from '@/lib/db/like-pattern';

describe('escapeLikePattern', () => {
  it('escapes backslash to double backslash', () => {
    expect(escapeLikePattern('test\\value')).toBe('test\\\\value');
  });

  it('escapes underscore to backslash+underscore', () => {
    expect(escapeLikePattern('first_name')).toBe('first\\_name');
  });

  it('escapes percent to backslash+percent', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%');
  });

  it('handles combined patterns with backslash, underscore, and percent', () => {
    // Input: 100\%_complete → escaped: backslash→\\, %→\%, _→\_
    expect(escapeLikePattern('100\\%_complete')).toBe('100\\\\\\%\\_complete');
  });

  it('returns empty string for empty input', () => {
    expect(escapeLikePattern('')).toBe('');
  });

  it('does not modify strings without special characters', () => {
    expect(escapeLikePattern('hello')).toBe('hello');
  });

  it('escapes multiple underscores', () => {
    expect(escapeLikePattern('a_b_c')).toBe('a\\_b\\_c');
  });

  it('escapes multiple percents', () => {
    expect(escapeLikePattern('10%20%')).toBe('10\\%20\\%');
  });
});

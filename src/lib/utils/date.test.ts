import { describe, expect, it } from 'vitest';
import {
  dateOnly,
  dateFromValue,
  formatDate,
  formatLongDate,
  formatShortDate,
  formatDueDate,
  daysFromToday,
  daysSince,
  yearsSinceDate,
} from '@/lib/utils/date';

describe('dateOnly', () => {
  it('extracts YYYY-MM-DD from ISO string', () => {
    expect(dateOnly('2024-03-15T10:30:00Z')).toBe('2024-03-15');
  });

  it('extracts YYYY-MM-DD from date-only string', () => {
    expect(dateOnly('2024-03-15')).toBe('2024-03-15');
  });

  it('extracts date from Date object', () => {
    const result = dateOnly(new Date(Date.UTC(2024, 2, 15)));
    expect(result).not.toBeNull();
    expect(result!.startsWith('2024-03-15')).toBe(true);
  });

  it('returns null for null', () => {
    expect(dateOnly(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(dateOnly(undefined)).toBeNull();
  });

  it('returns null for strings without valid date pattern', () => {
    expect(dateOnly('not-a-date')).toBeNull();
    expect(dateOnly('hello world')).toBeNull();
  });
});

describe('dateFromValue', () => {
  it('parses YYYY-MM-DD to UTC midnight', () => {
    const date = dateFromValue('2024-03-15');
    expect(date).not.toBeNull();
    expect(date!.getUTCFullYear()).toBe(2024);
    expect(date!.getUTCMonth()).toBe(2);
    expect(date!.getUTCDate()).toBe(15);
  });

  it('returns null for null', () => {
    expect(dateFromValue(null)).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(dateFromValue('not-a-date')).toBeNull();
  });
});

describe('formatDate', () => {
  it('formats a date string as DD/MM/YYYY', () => {
    expect(formatDate('2024-03-15')).toBe('15/03/2024');
  });

  it('returns em dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns em dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });
});

describe('formatLongDate', () => {
  it('formats a date as long pt-BR string', () => {
    const result = formatLongDate('2024-03-15');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('returns null for null', () => {
    expect(formatLongDate(null)).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(formatLongDate('not-a-date')).toBeNull();
  });
});

describe('formatShortDate', () => {
  it('formats a date as DD/MM', () => {
    expect(formatShortDate('2024-03-15')).toBe('15/03');
  });

  it('returns null for null', () => {
    expect(formatShortDate(null)).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(formatShortDate('invalid')).toBeNull();
  });
});

describe('formatDueDate', () => {
  it('formats a date as DD short-month', () => {
    const result = formatDueDate('2024-03-15');
    expect(result).toContain('15');
    expect(result).not.toContain('.');
  });

  it('returns null for null', () => {
    expect(formatDueDate(null)).toBeNull();
  });
});

describe('daysFromToday', () => {
  it('returns 0 for today', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(daysFromToday(today)).toBe(0);
  });

  it('returns positive number for future dates', () => {
    const future = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    expect(daysFromToday(future)).toBeGreaterThan(0);
  });

  it('returns negative number for past dates', () => {
    const past = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    expect(daysFromToday(past)).toBeLessThan(0);
  });

  it('returns null for null', () => {
    expect(daysFromToday(null)).toBeNull();
  });
});

describe('daysSince', () => {
  it('returns 0 for today', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(daysSince(today)).toBe(0);
  });

  it('returns positive number for past dates', () => {
    const past = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
    expect(daysSince(past)).toBeGreaterThanOrEqual(9);
  });

  it('returns null for null', () => {
    expect(daysSince(null)).toBeNull();
  });
});

describe('yearsSinceDate', () => {
  it('returns N-1 for a date N years minus 1 day ago', () => {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setUTCFullYear(fiveYearsAgo.getUTCFullYear() - 5);
    fiveYearsAgo.setUTCDate(fiveYearsAgo.getUTCDate() + 1);
    const dateStr = fiveYearsAgo.toISOString().slice(0, 10);
    expect(yearsSinceDate(dateStr)).toBe(4);
  });

  it('returns N for a date exactly N years ago today', () => {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setUTCFullYear(fiveYearsAgo.getUTCFullYear() - 5);
    const dateStr = fiveYearsAgo.toISOString().slice(0, 10);
    expect(yearsSinceDate(dateStr)).toBe(5);
  });

  it('returns 0 for this year', () => {
    const thisYear = new Date().getUTCFullYear();
    const month = new Date().getUTCMonth() + 1;
    const day = new Date().getUTCDate();
    const earlier = `${thisYear}-${String(month).padStart(2, '0')}-${String(Math.max(1, day - 1)).padStart(2, '0')}`;
    expect(yearsSinceDate(earlier)).toBe(0);
  });

  it('returns null for null', () => {
    expect(yearsSinceDate(null)).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(yearsSinceDate('invalid')).toBeNull();
  });
});

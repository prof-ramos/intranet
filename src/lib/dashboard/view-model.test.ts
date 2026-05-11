import { describe, expect, it } from 'vitest';
import { formatDashboardDueDate } from '@/lib/dashboard/view-model';

describe('formatDashboardDueDate', () => {
  it('formats ISO-like values as dd/mm', () => {
    expect(formatDashboardDueDate('2026-05-11')).toBe('11/05');
    expect(formatDashboardDueDate('2026-05-11T12:00:00.000Z')).toBe('11/05');
  });

  it('returns null for empty values', () => {
    expect(formatDashboardDueDate(null)).toBeNull();
    expect(formatDashboardDueDate(undefined)).toBeNull();
  });

  it('returns null for invalid date strings', () => {
    expect(formatDashboardDueDate('invalid')).toBeNull();
    expect(formatDashboardDueDate('2026-13-01')).toBeNull();
    expect(formatDashboardDueDate('2026-02-30')).toBeNull();
  });

  it('formats edge ISO dates with leading zeros', () => {
    expect(formatDashboardDueDate('2026-01-05')).toBe('05/01');
    expect(formatDashboardDueDate('2026-12-31')).toBe('31/12');
  });
});

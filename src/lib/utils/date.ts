/**
 * Date formatting and calculation utilities for the ASOF intranet.
 *
 * All functions handle null/undefined gracefully and produce pt-BR formatted output.
 * They operate on date-only values (YYYY-MM-DD strings or Date objects).
 * All date arithmetic uses UTC to avoid timezone-dependent results.
 */

const MS_PER_DAY = 86_400_000;

// ⚡ Bolt: Cache Intl.DateTimeFormat instances to prevent expensive object creation on every call
const dtfShort = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const dtfLong = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const dtfDue = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
});

function parseDateParts(value: string | Date | null | undefined): { year: number; month: number; day: number } | null {
  const d = dateOnly(value);
  if (!d) return null;
  const [year, month, day] = d.split('-').map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

/**
 * Extract the date portion from a string or Date, returning YYYY-MM-DD or null.
 * Returns null for strings that don't contain a valid date pattern.
 */
export function dateOnly(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const extracted = value.split(/[ T]/)[0];
  return extracted && /^\d{4}-\d{2}-\d{2}$/.test(extracted) ? extracted : null;
}

/**
 * Parse a date-only string (YYYY-MM-DD) or Date into a Date at midnight UTC.
 * Returns null for nullish/invalid input.
 */
export function dateFromValue(value: string | null | undefined): Date | null {
  const d = dateOnly(value);
  if (!d) return null;
  const parsed = new Date(`${d}T00:00:00Z`);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format a date as DD/MM/YYYY (pt-BR short). Returns '—' for null.
 * Uses UTC to avoid timezone-dependent results.
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = dateFromValue(value instanceof Date ? value.toISOString() : value);
  if (!date) return '—';
  return dtfShort.format(date);
}

/**
 * Format a date as a long-form pt-BR string like "11 de maio de 2026".
 * Returns null for nullish/invalid input.
 */
export function formatLongDate(value: string | Date | null | undefined): string | null {
  const parts = parseDateParts(value);
  if (!parts) return null;
  return dtfLong.format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}

/**
 * Format a date as DD/MM (compact). Returns null for nullish/invalid input.
 * Uses dateFromValue for UTC consistency.
 */
export function formatShortDate(value: string | Date | null | undefined): string | null {
  const d = dateOnly(value);
  if (!d) return null;
  const [yearText, monthText, dayText] = d.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
  return isValid ? `${dayText}/${monthText}` : null;
}

/**
 * Format a date as "11 mai" (short month, pt-BR). Returns null for nullish input.
 */
export function formatDueDate(value: string | null | undefined): string | null {
  const date = dateFromValue(value);
  if (!date) return null;
  return dtfDue.format(date).replace('.', '');
}

/**
 * Calculate the number of days between today (UTC) and a date (positive = future, negative = past).
 * Returns null for nullish input. Both dates are computed in UTC.
 */
export function daysFromToday(value: string | null | undefined): number | null {
  const date = dateFromValue(value);
  if (!date) return null;
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((date.getTime() - today) / MS_PER_DAY);
}

/**
 * Calculate how many days have passed since a date. Returns null for nullish input.
 * Uses UTC for consistency.
 */
export function daysSince(value: string | Date | null | undefined): number | null {
  const date = dateFromValue(value instanceof Date ? value.toISOString() : value);
  if (!date) return null;
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - date.getTime()) / MS_PER_DAY);
}

/**
 * Calculate full years since a date using proper calendar comparison.
 * Returns null for nullish/invalid input.
 */
export function yearsSinceDate(value: string | Date | null | undefined): number | null {
  const parts = parseDateParts(value);
  if (!parts) return null;
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const currentDay = now.getUTCDate();
  let years = currentYear - parts.year;
  if (currentMonth < parts.month || (currentMonth === parts.month && currentDay < parts.day)) {
    years--;
  }
  return years;
}

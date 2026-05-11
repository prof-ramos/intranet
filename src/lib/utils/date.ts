/**
 * Date formatting and calculation utilities for the ASOF intranet.
 *
 * All functions handle null/undefined gracefully and produce pt-BR formatted output.
 * They operate on date-only values (YYYY-MM-DD strings or Date objects).
 */

const MS_PER_DAY = 86_400_000;

/**
 * Extract the date portion from a string or Date, returning YYYY-MM-DD or null.
 */
export function dateOnly(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.split(/[ T]/)[0] ?? value;
}

/**
 * Parse a date-only string (YYYY-MM-DD) or Date into a Date at midnight UTC.
 * Returns null for nullish/invalid input.
 */
export function dateFromValue(value: string | null | undefined): Date | null {
  const d = dateOnly(value);
  if (!d) return null;
  const parsed = new Date(`${d}T00:00:00`);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format a date as DD/MM/YYYY (pt-BR short). Returns '—' for null.
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString('pt-BR');
}

/**
 * Format a date as a long-form pt-BR string like "11 de maio de 2026".
 * Returns null for nullish input.
 */
export function formatLongDate(value: string | Date | null | undefined): string | null {
  const d = dateOnly(value);
  if (!d) return null;
  const [year, month, day] = d.split('-').map(Number);
  if (!year || !month || !day) return d;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Format a date as DD/MM (compact). Returns null for nullish/invalid input.
 */
export function formatShortDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const normalized = value instanceof Date ? value.toISOString() : value;
  const d = dateOnly(normalized);
  if (!d) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
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
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

/**
 * Calculate the number of days between today and a date (positive = future, negative = past).
 * Returns null for nullish input.
 */
export function daysFromToday(value: string | null | undefined): number | null {
  const date = dateFromValue(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / MS_PER_DAY);
}

/**
 * Calculate how many days have passed since a date. Returns null for nullish input.
 */
export function daysSince(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Math.floor((Date.now() - d.getTime()) / MS_PER_DAY);
}

/**
 * Calculate full years since a date. Returns null for nullish/invalid input.
 */
export function yearsSinceDate(value: string | Date | null | undefined): number | null {
  const d = dateOnly(value);
  if (!d) return null;
  const [year, month, day] = d.split('-').map(Number);
  if (!year || !month || !day) return null;
  const start = new Date(Date.UTC(year, month - 1, day));
  return Math.floor((Date.now() - start.getTime()) / (365.25 * MS_PER_DAY));
}
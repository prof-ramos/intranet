import { bench, describe } from 'vitest';
import { formatDate, formatLongDate, formatDueDate } from './date';

describe('date formatting utilities', () => {
  const dateStr = '2023-05-11';
  const dateObj = new Date(dateStr + 'T00:00:00Z');

  // Baseline (old behavior)
  bench('formatDate (toLocaleDateString inline)', () => {
    dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  });

  bench('formatLongDate (toLocaleDateString inline)', () => {
    dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  });

  bench('formatDueDate (toLocaleDateString inline)', () => {
    dateObj
      .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
      .replace('.', '');
  });

  // Optimized (new behavior via utils)
  bench('formatDate (cached Intl.DateTimeFormat)', () => {
    formatDate(dateStr);
  });

  bench('formatLongDate (cached Intl.DateTimeFormat)', () => {
    formatLongDate(dateStr);
  });

  bench('formatDueDate (cached Intl.DateTimeFormat)', () => {
    formatDueDate(dateStr);
  });
});

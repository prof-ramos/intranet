import { bench, describe } from 'vitest';
import { formatDate, formatLongDate, formatDueDate } from './date';

describe('Date formatting utilities', () => {
  const dates = Array.from({ length: 50 }).map((_, i) => `2026-05-${String((i % 28) + 1).padStart(2, '0')}`);

  bench('formatDate', () => {
    for (const d of dates) {
      formatDate(d);
    }
  });

  bench('formatLongDate', () => {
    for (const d of dates) {
      formatLongDate(d);
    }
  });

  bench('formatDueDate', () => {
    for (const d of dates) {
      formatDueDate(d);
    }
  });
});

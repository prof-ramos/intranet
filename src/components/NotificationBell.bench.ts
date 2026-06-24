import { bench, describe } from 'vitest';

describe('Intl formatting caching vs recreation', () => {
  const dates = Array.from({ length: 1000 }).map((_, i) => ({
    diffMinutes: -i - 1,
    diffHours: -i - 1,
    diffDays: -i - 1,
    date: new Date(Date.now() - i * 10000000),
  }));

  bench('new Intl instances', () => {
    for (const item of dates) {
      new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(item.diffMinutes, 'minute');
      new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(item.diffHours, 'hour');
      new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(item.diffDays, 'day');
      new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(item.date);
    }
  });

  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  const dtf = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  bench('cached Intl instances', () => {
    for (const item of dates) {
      rtf.format(item.diffMinutes, 'minute');
      rtf.format(item.diffHours, 'hour');
      rtf.format(item.diffDays, 'day');
      dtf.format(item.date);
    }
  });
});

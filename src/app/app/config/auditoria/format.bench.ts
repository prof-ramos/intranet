import { bench, describe } from 'vitest';

describe('Date formatting', () => {
  const dates = Array.from({ length: 50 }).map(() => new Date());

  bench('toLocaleString inline', () => {
    for (const d of dates) {
      d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });
    }
  });

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

  bench('cached Intl.DateTimeFormat', () => {
    for (const d of dates) {
      formatter.format(d);
    }
  });
});

import { bench, describe } from 'vitest';

describe('ISO Date string comparison', () => {
  const items = Array.from({ length: 1000 }).map((_, i) => ({
    createdAt: new Date(Date.now() - i * 10000).toISOString(),
  }));

  bench('new Date().getTime()', () => {
    const data = [...items];
    data.sort((left, right) => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  });

  bench('Direct string comparison', () => {
    const data = [...items];
    data.sort((left, right) => {
      return left.createdAt > right.createdAt ? -1 : left.createdAt < right.createdAt ? 1 : 0;
    });
  });
});

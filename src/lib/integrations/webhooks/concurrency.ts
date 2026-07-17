export interface ConcurrencyLimiter {
  run<T>(task: () => Promise<T> | T): Promise<T>;
}

export function createConcurrencyLimiter(limit: number): ConcurrencyLimiter {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('concurrency limit must be a positive integer.');
  }

  let active = 0;
  const queue: Array<() => void> = [];

  const drain = () => {
    while (active < limit && queue.length > 0) {
      const start = queue.shift();
      start?.();
    }
  };

  return {
    run<T>(task: () => Promise<T> | T): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queue.push(() => {
          active += 1;
          Promise.resolve()
            .then(task)
            .then(resolve, reject)
            .finally(() => {
              active -= 1;
              drain();
            });
        });
        drain();
      });
    },
  };
}

export function mapSettledWithConcurrency<T, R>(
  items: readonly T[],
  limiter: ConcurrencyLimiter,
  mapper: (item: T, index: number) => Promise<R> | R,
): Promise<Array<PromiseSettledResult<R>>> {
  return Promise.all(
    items.map((item, index) =>
      limiter
        .run(() => mapper(item, index))
        .then(
          (value): PromiseFulfilledResult<R> => ({ status: 'fulfilled', value }),
          (reason): PromiseRejectedResult => ({ status: 'rejected', reason }),
        ),
    ),
  );
}

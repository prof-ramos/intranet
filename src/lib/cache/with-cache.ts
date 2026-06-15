import { unstable_cache } from 'next/cache';

export interface WithCacheOptions<TArgs extends unknown[], TReturn> {
  /** The function to cache. */
  fn: (...args: TArgs) => Promise<TReturn> | TReturn;
  /** Generates the cache key segments from the arguments. */
  keyFn: (...args: TArgs) => string[];
  /** Time-to-live in seconds (passed to Next.js revalidate). */
  ttl: number;
  /** Tags for explicit invalidation. */
  tags: string[];
  /** Optional max entries for the in-memory wrapper cache. Defaults to 100. */
  maxEntries?: number;
}

/**
 * Generic cache wrapper around Next.js unstable_cache.
 *
 * An in-memory Map keeps the unstable_cache function instances so that
 * repeated calls with the same arguments reuse the same wrapper rather
 * than creating a new one every time. The Map is bounded by maxEntries
 * (default 100) to prevent unbounded memory growth.
 */
export function withCache<TArgs extends unknown[], TReturn>(
  options: WithCacheOptions<TArgs, TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  const { fn, keyFn, ttl, tags, maxEntries = 100 } = options;

  const cacheMap = new Map<string, ReturnType<typeof unstable_cache>>();
  const limit = maxEntries;

  function setWithLimit(map: typeof cacheMap, key: string, value: ReturnType<typeof unstable_cache>) {
    if (map.size >= limit && !map.has(key)) {
      const firstKey = map.keys().next().value;
      if (firstKey !== undefined) {
        map.delete(firstKey);
      }
    }
    map.set(key, value);
  }

  return async (...args: TArgs): Promise<TReturn> => {
    const key = keyFn(...args);
    const cacheKey = JSON.stringify(key);
    const existing = cacheMap.get(cacheKey);
    if (existing) {
      return existing() as Promise<TReturn>;
    }

    const created = unstable_cache(async () => fn(...args), key, {
      revalidate: ttl,
      tags,
    });

    setWithLimit(cacheMap, cacheKey, created);
    return created() as Promise<TReturn>;
  };
}

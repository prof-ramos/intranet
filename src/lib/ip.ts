import { env } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ip');

/**
 * Number of trusted reverse-proxy hops in front of this application.
 *
 * When behind one reverse proxy (e.g. Vercel, Cloudflare, nginx), set to 1.
 * Behind two layers (e.g. Cloudflare → Vercel), set to 2.
 * A value of 0 means no proxy is trusted and the rightmost entry in
 * `x-forwarded-for` (or the direct socket IP) will be used.
 *
 * Controlled by the `TRUSTED_PROXY_COUNT` env var (defaults to 1 for
 * Vercel/managed Postgres deployments).
 */
export function getTrustedProxyCount(): number {
  const raw = env.TRUSTED_PROXY_COUNT;
  // raw is number | undefined (z.preprocess(emptyStringToUndefined, z.coerce.number()) in env schema)
  if (raw === undefined) return 1; // sensible default: 1 proxy
  if (!Number.isInteger(raw) || raw < 0) {
    logger.warn('[ip] TRUSTED_PROXY_COUNT is invalid; falling back to 1', { value: raw });
    return 1;
  }
  return raw;
}

/**
 * Extract the real client IP from request headers using trusted-proxy counting.
 *
 * How it works:
 * - `x-forwarded-for` is a comma-separated list where each proxy appends
 *   the previous hop's IP. The **rightmost** entries are set by trusted
 *   infrastructure; the **leftmost** entries are set by the client and can
 *   be spoofed.
 * - With `TRUSTED_PROXY_COUNT = N`, we pick the IP at position
 *   `entries.length - N - 1` from the right — i.e. the rightmost entry
 *   that was set *before* the trusted proxy chain started.
 * - If `x-forwarded-for` has fewer entries than `TRUSTED_PROXY_COUNT + 1`,
 *   the leftmost entry is returned (safe fallback for direct connections).
 * - Falls back to `x-real-ip`, then `'unknown'`.
 *
 * **Vercel**: sets `x-forwarded-for` with the client IP as the sole entry
 * (or appends to an existing list from an upstream CDN). With a single
 * Vercel proxy, `TRUSTED_PROXY_COUNT = 1` reads the rightmost *non-proxy*
 * entry correctly.
 *
 * **Cloudflare → Vercel**: Cloudflare prepends the real client IP, then
 * Vercel appends the Cloudflare IP. With `TRUSTED_PROXY_COUNT = 2`, we
 * correctly skip both proxy-added entries.
 */
export function getTrustedClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');

  if (forwarded) {
    const entries = forwarded
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (entries.length > 0) {
      const proxyCount = getTrustedProxyCount();

      // The client IP is at index `entries.length - proxyCount - 1`.
      // Clamp to 0 (leftmost) if the math would go negative — this
      // handles the case where there are fewer hops than expected.
      const clientIndex = Math.max(0, entries.length - proxyCount - 1);
      const ip = entries[clientIndex];
      if (ip) return ip;
    }
  }

  const realIp = headers.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();

  return 'unknown';
}

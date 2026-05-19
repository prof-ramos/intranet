/**
 * Provides the `ws` package as a WebSocket transport for Supabase Realtime
 * in Node.js environments where native WebSocket is unavailable (< 22).
 *
 * Supabase's realtime-js requires a WebSocket implementation. Browsers have
 * native WebSocket; Node.js 22+ has it built-in; but Node.js 20 does not.
 * This module conditionally imports `ws` so that:
 * - In Node.js < 22: `ws` is used as the transport
 * - In Node.js >= 22 or browsers: native WebSocket is used (no import needed)
 * - In edge/Vercel builds: the import is tree-shaken if realtime is unused
 */

import type { RealtimeClientOptions } from '@supabase/realtime-js';

let _wsTransport: typeof WebSocket | undefined;

/**
 * Returns a `realtime` option suitable for `createClient()` that provides
 * the `ws` package as a WebSocket transport on Node.js < 22.
 *
 * On Node.js >= 22 (or browsers), native WebSocket is available and this
 * returns an empty object (no override needed).
 */
export function getNodeRealtimeOptions(): Pick<RealtimeClientOptions, 'transport'> {
  if (typeof globalThis.WebSocket !== 'undefined') {
    return {};
  }

  // Lazy-load `ws` only when native WebSocket is missing
  if (!_wsTransport) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ws = require('ws');
    _wsTransport = ws as unknown as typeof WebSocket;
  }

  return { transport: _wsTransport };
}
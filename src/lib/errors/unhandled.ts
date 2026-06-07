import { createLogger } from '@/lib/logger';
import { toSafeErrorLog } from '@/lib/error-log';

const logger = createLogger('unhandled');
const REGISTERED = Symbol.for('asof.unhandledHandlersRegistered');


const g = globalThis as Record<symbol, unknown> & typeof globalThis;

export function registerUnhandledHandlers(): void {
  if (g[REGISTERED] === true) {
    return;
  }
  g[REGISTERED] = true;

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { error: toSafeErrorLog(reason) }, reason instanceof Error ? reason : undefined);
    // Adding a listener suppresses Node's default fatal behavior; exit explicitly to preserve crash semantics.
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: toSafeErrorLog(err) }, err);
    process.exit(1);
  });
}

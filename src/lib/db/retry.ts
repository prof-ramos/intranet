import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';

const logger = createLogger('db');

function isTransientConnectionError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  const code = (error as { code?: string }).code;
  return (
    msg.includes('connection closed') ||
    msg.includes('connection terminated') ||
    msg.includes('connection reset') ||
    msg.includes('client has encountered a connection error') ||
    code === '57P01' ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED'
  );
}

const MAX_BACKOFF_MS = 5000;

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryTransientConnection<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientConnectionError(error)) {
        throw error;
      }
      lastError = error;
      if (attempt < maxAttempts) {
        logger.warn(
          'Retrying after transient database connection closure.',
          { error: toSafeErrorLog(error) },
        );
        const backoff = Math.min(1000 * Math.pow(2, attempt - 1), MAX_BACKOFF_MS);
        await delayMs(backoff);
      }
    }
  }
  throw lastError;
}

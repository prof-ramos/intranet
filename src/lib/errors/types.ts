export type ErrorCode =
  | 'CONCURRENCY_CONFLICT'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'UNAUTHORIZED';

export interface SerializedError {
  name: string;
  code: string;
  message: string;
  cause?: string;
}

export function serializeError(err: { name: string; code: string; message: string; cause?: unknown }): SerializedError {
  const result: SerializedError = {
    name: err.name,
    code: err.code,
    message: err.message,
  };

  if (err.cause instanceof Error) {
    result.cause = `${err.cause.name}: ${err.cause.message}`;
  } else if (err.cause !== undefined) {
    try {
      result.cause = JSON.stringify(err.cause).slice(0, 500);
    } catch {
      result.cause = String(err.cause).slice(0, 500);
    }
  }

  return result;
}

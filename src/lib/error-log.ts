export interface SafeErrorLog {
  kind: 'error' | 'non_error_thrown';
  name?: string;
  code?: string;
  digest?: string;
}

export function toSafeErrorLog(error: unknown): SafeErrorLog {
  if (error instanceof Error) {
    const withCode = error as Error & { code?: unknown; digest?: unknown };

    return {
      kind: 'error',
      name: error.name,
      code: typeof withCode.code === 'string' ? withCode.code : undefined,
      digest: typeof withCode.digest === 'string' ? withCode.digest : undefined,
    };
  }

  if (error && typeof error === 'object') {
    const candidate = error as { name?: unknown; code?: unknown; digest?: unknown };

    return {
      kind: 'non_error_thrown',
      name: typeof candidate.name === 'string' ? candidate.name : undefined,
      code: typeof candidate.code === 'string' ? candidate.code : undefined,
      digest: typeof candidate.digest === 'string' ? candidate.digest : undefined,
    };
  }

  return { kind: 'non_error_thrown' };
}

export function ensureError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  let message = 'An unknown error occurred';
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    try {
      message = JSON.stringify(error);
    } catch {
      message = String(error);
    }
  }

  const newError = new Error(message);
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    if (typeof errorObj.name === 'string') newError.name = errorObj.name;
    if (typeof errorObj.stack === 'string') newError.stack = errorObj.stack;
    if (errorObj.code) (newError as Error & { code?: unknown }).code = errorObj.code;
  }
  return newError;
}

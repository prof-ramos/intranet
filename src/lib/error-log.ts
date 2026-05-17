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

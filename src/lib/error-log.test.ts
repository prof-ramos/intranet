import { describe, expect, it } from 'vitest';
import { toSafeErrorLog, ensureError } from './error-log';

describe('toSafeErrorLog', () => {
  it('returns a safe subset for Error instances', () => {
    const error = Object.assign(new Error('cpf=12345678901'), {
      code: 'E_DB',
      digest: 'abc123',
    });

    expect(toSafeErrorLog(error)).toEqual({
      kind: 'error',
      name: 'Error',
      code: 'E_DB',
      digest: 'abc123',
    });
  });

  it('handles non-Error objects without leaking arbitrary fields', () => {
    expect(
      toSafeErrorLog({
        name: 'CustomFailure',
        code: 'E_CUSTOM',
        email: 'user@example.com',
      }),
    ).toEqual({
      kind: 'non_error_thrown',
      name: 'CustomFailure',
      code: 'E_CUSTOM',
      digest: undefined,
    });
  });

  it('falls back for primitive thrown values', () => {
    expect(toSafeErrorLog('boom')).toEqual({ kind: 'non_error_thrown' });
  });
});

describe('ensureError', () => {
  it('returns the same object if it is an instance of Error', () => {
    const error = new Error('original message');
    expect(ensureError(error)).toBe(error);
  });

  it('converts a string error to a real Error object', () => {
    const result = ensureError('something went wrong');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('something went wrong');
  });

  it('converts an object error with a message property', () => {
    const result = ensureError({ message: 'custom object error', code: '500' });
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('custom object error');
    expect((result as Error & { code?: string }).code).toBe('500');
  });

  it('fallback for arbitrary structures or primitives', () => {
    const result = ensureError(12345);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('12345');
  });
});

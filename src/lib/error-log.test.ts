import { describe, expect, it } from 'vitest';
import { toSafeErrorLog } from './error-log';

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

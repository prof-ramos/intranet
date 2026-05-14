import { describe, expect, it } from 'vitest';
import { SENSITIVE_KEY_PATTERN, sanitizePiiValue } from './sanitize-pii';

describe('SENSITIVE_KEY_PATTERN', () => {
  it('matches cpf', () => {
    expect(SENSITIVE_KEY_PATTERN.test('cpf')).toBe(true);
  });

  it('matches siape', () => {
    expect(SENSITIVE_KEY_PATTERN.test('siape')).toBe(true);
  });

  it('matches email', () => {
    expect(SENSITIVE_KEY_PATTERN.test('email')).toBe(true);
  });

  it('matches sourcePayload', () => {
    expect(SENSITIVE_KEY_PATTERN.test('sourcePayload')).toBe(true);
  });

  it('matches primaryEmail', () => {
    expect(SENSITIVE_KEY_PATTERN.test('primaryEmail')).toBe(true);
  });

  it('matches secret', () => {
    expect(SENSITIVE_KEY_PATTERN.test('secret')).toBe(true);
  });

  it('matches token', () => {
    expect(SENSITIVE_KEY_PATTERN.test('token')).toBe(true);
  });

  it('matches password', () => {
    expect(SENSITIVE_KEY_PATTERN.test('password')).toBe(true);
  });

  it('does not match non-sensitive keys', () => {
    expect(SENSITIVE_KEY_PATTERN.test('name')).toBe(false);
    expect(SENSITIVE_KEY_PATTERN.test('id')).toBe(false);
    expect(SENSITIVE_KEY_PATTERN.test('assignment')).toBe(false);
  });
});

describe('sanitizePiiValue', () => {
  it('redacts values of sensitive keys like cpf, siape, email', () => {
    const input = {
      name: 'João',
      cpf: '123.456.789-00',
      siape: '9876543',
      email: 'joao@example.com',
    };

    const result = sanitizePiiValue(input);

    expect(result).toEqual({
      name: 'João',
      cpf: '[REDACTED]',
      siape: '[REDACTED]',
      email: '[REDACTED]',
    });
  });

  it('passes through values of non-sensitive keys', () => {
    const input = {
      id: 42,
      name: 'Maria',
      active: true,
    };

    const result = sanitizePiiValue(input);

    expect(result).toEqual(input);
  });

  it('sanitizes nested objects', () => {
    const input = {
      profile: {
        name: 'Carlos',
        email: 'carlos@example.com',
        address: 'Rua ABC 123',
      },
      meta: {
        count: 10,
      },
    };

    const result = sanitizePiiValue(input);

    expect(result).toEqual({
      profile: {
        name: 'Carlos',
        email: '[REDACTED]',
        address: '[REDACTED]',
      },
      meta: {
        count: 10,
      },
    });
  });

  it('sanitizes arrays', () => {
    const input = [
      { name: 'Ana', cpf: '111.222.333-44' },
      { name: 'Bia', cpf: '555.666.777-88' },
    ];

    const result = sanitizePiiValue(input);

    expect(result).toEqual([
      { name: 'Ana', cpf: '[REDACTED]' },
      { name: 'Bia', cpf: '[REDACTED]' },
    ]);
  });

  it('handles circular references without infinite loops', () => {
    const input: Record<string, unknown> = { name: 'loop' };
    input.self = input;

    const result = sanitizePiiValue(input);

    expect(result).toEqual({
      name: 'loop',
      self: '[circular]',
    });
  });

  it('redacts sourcePayload key', () => {
    const input = {
      eventType: 'associate.updated',
      sourcePayload: { raw: 'sensitive-data' },
    };

    const result = sanitizePiiValue(input);

    expect(result).toEqual({
      eventType: 'associate.updated',
      sourcePayload: '[REDACTED]',
    });
  });

  it('converts Date to ISO string', () => {
    const date = new Date('2026-05-20T12:00:00.000Z');
    expect(sanitizePiiValue(date)).toBe('2026-05-20T12:00:00.000Z');
  });

  it('converts bigint to string', () => {
    expect(sanitizePiiValue(BigInt(9007199254740991))).toBe('9007199254740991');
  });

  it('replaces functions and symbols with null', () => {
    expect(sanitizePiiValue(() => {})).toBeNull();
    expect(sanitizePiiValue(Symbol('foo'))).toBeNull();
  });

  it('converts nested Date and bigint values inside objects', () => {
    const input = {
      timestamp: new Date('2026-01-15T08:30:00.000Z'),
      bigCount: BigInt(123),
      name: 'test',
    };

    const result = sanitizePiiValue(input);

    expect(result).toEqual({
      timestamp: '2026-01-15T08:30:00.000Z',
      bigCount: '123',
      name: 'test',
    });
  });

  it('returns primitives as-is', () => {
    expect(sanitizePiiValue('hello')).toBe('hello');
    expect(sanitizePiiValue(42)).toBe(42);
    expect(sanitizePiiValue(true)).toBe(true);
    expect(sanitizePiiValue(null)).toBeNull();
    expect(sanitizePiiValue(undefined)).toBeUndefined();
  });

  it('returns empty object as-is', () => {
    expect(sanitizePiiValue({})).toEqual({});
  });

  it('returns empty array as-is', () => {
    expect(sanitizePiiValue([])).toEqual([]);
  });

  it('does not redact internal IDs like JUR-2026-001', () => {
    const input = {
      oficioId: 'JUR-2026-001',
      processNumber: '2026-042',
      name: 'Carlos',
    };

    const result = sanitizePiiValue(input);

    expect(result).toEqual({
      oficioId: 'JUR-2026-001',
      processNumber: '2026-042',
      name: 'Carlos',
    });
  });

  it('redacts CPF values under sensitive keys', () => {
    const input = {
      cpf: '123.456.789-00',
      name: 'Maria',
    };

    const result = sanitizePiiValue(input);

    expect(result).toEqual({
      cpf: '[REDACTED]',
      name: 'Maria',
    });
  });

  it('does not redact numeric codes under non-sensitive keys', () => {
    const input = {
      eventId: 2026001,
      referenceCode: 'REF-2026-042',
      count: 42,
    };

    const result = sanitizePiiValue(input);

    expect(result).toEqual({
      eventId: 2026001,
      referenceCode: 'REF-2026-042',
      count: 42,
    });
  });
});
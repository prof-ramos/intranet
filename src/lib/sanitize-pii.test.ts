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
});
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { formDataToRecord, firstZodError, parseFormAction } from '@/lib/server-actions/utils';
import type { ZodIssue } from 'zod';

describe('formDataToRecord', () => {
  it('converts single-value fields to scalars', () => {
    const fd = new FormData();
    fd.append('name', 'João');
    fd.append('email', 'joao@example.com');
    const result = formDataToRecord(fd);
    expect(result).toEqual({ name: 'João', email: 'joao@example.com' });
  });

  it('converts multi-value fields to arrays', () => {
    const fd = new FormData();
    fd.append('tags', 'a');
    fd.append('tags', 'b');
    fd.append('tags', 'c');
    const result = formDataToRecord(fd);
    expect(result).toEqual({ tags: ['a', 'b', 'c'] });
  });

  it('handles empty form data', () => {
    const fd = new FormData();
    const result = formDataToRecord(fd);
    expect(result).toEqual({});
  });
});

describe('firstZodError', () => {
  it('returns first issue message', () => {
    const issues: ZodIssue[] = [
      { message: 'Campo obrigatório', code: 'custom', path: [] } as ZodIssue,
      { message: 'Segundo erro', code: 'custom', path: [] } as ZodIssue,
    ];
    expect(firstZodError(issues)).toBe('Campo obrigatório');
  });

  it('returns default message for empty issues', () => {
    expect(firstZodError([])).toBe('Dados inválidos.');
  });
});

describe('parseFormAction', () => {
  it('parses FormData through the provided schema', () => {
    const fd = new FormData();
    fd.set('id', '42');
    fd.set('name', 'Alice');

    const result = parseFormAction(
      fd,
      z.object({
        id: z.coerce.number(),
        name: z.string(),
      }),
    );

    expect(result).toEqual({ id: 42, name: 'Alice' });
  });

  it('throws the first Zod issue message', () => {
    const fd = new FormData();
    fd.set('name', '');

    expect(() =>
      parseFormAction(
        fd,
        z.object({
          name: z.string().min(1, 'Nome obrigatório'),
        }),
      ),
    ).toThrow('Nome obrigatório');
  });

  it('supports preprocessing raw form values before validation', () => {
    const fd = new FormData();
    fd.set('enabled', 'true');

    const result = parseFormAction(
      fd,
      z.object({ enabled: z.boolean() }),
      (raw) => ({ enabled: raw.enabled === 'true' }),
    );

    expect(result).toEqual({ enabled: true });
  });
});

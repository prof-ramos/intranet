import { describe, expect, it } from 'vitest';
import { formDataToRecord, firstZodError } from '@/lib/server-actions/utils';
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
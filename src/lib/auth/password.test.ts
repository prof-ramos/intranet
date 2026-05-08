import { describe, expect, it } from 'vitest';
import { validateNewPassword } from '@/lib/auth/password';

describe('password validation', () => {
  it('rejects short or incomplete passwords', () => {
    expect(validateNewPassword('Abc123!')).toEqual({
      valid: false,
      message: 'A senha deve ter pelo menos 12 caracteres.',
    });

    expect(validateNewPassword('abcdefghijkl')).toEqual({
      valid: false,
      message: 'A senha deve combinar letras maiúsculas, minúsculas, números e símbolos.',
    });
  });

  it('accepts strong passwords', () => {
    expect(validateNewPassword('Senha-Forte-2026!')).toEqual({ valid: true });
  });

  it('accepts a strong password with exactly 12 characters', () => {
    expect(validateNewPassword('Abcdef123!@#')).toEqual({ valid: true });
  });
});

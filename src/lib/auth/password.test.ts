import { describe, expect, it } from 'vitest';
import { validateNewPassword } from '@/lib/auth/password';

describe('password validation', () => {
  it('rejects passwords shorter than 8 characters', () => {
    expect(validateNewPassword('Ab1!')).toEqual({
      valid: false,
      message: 'A senha deve ter pelo menos 8 caracteres.',
    });
  });

  it('rejects passwords without a number', () => {
    expect(validateNewPassword('abcdefgh!')).toEqual({
      valid: false,
      message: 'A senha deve conter pelo menos um número e um caractere especial.',
    });
  });

  it('rejects passwords without a special character', () => {
    expect(validateNewPassword('abcdefgh1')).toEqual({
      valid: false,
      message: 'A senha deve conter pelo menos um número e um caractere especial.',
    });
  });

  it('accepts valid passwords with 8+ chars, 1 number, 1 special char', () => {
    expect(validateNewPassword('Senha-26')).toEqual({ valid: true });
    expect(validateNewPassword('abc123!xyz')).toEqual({ valid: true });
    expect(validateNewPassword('Min1@max')).toEqual({ valid: true });
  });
});

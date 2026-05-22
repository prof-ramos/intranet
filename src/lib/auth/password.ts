export type PasswordValidationResult = { valid: true } | { valid: false; message: string };

export function validateNewPassword(password: string): PasswordValidationResult {
  if (password.length < 8) {
    return {
      valid: false,
      message: 'A senha deve ter pelo menos 8 caracteres.',
    };
  }

  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (!hasNumber || !hasSymbol) {
    return {
      valid: false,
      message: 'A senha deve conter pelo menos um número e um caractere especial.',
    };
  }

  return { valid: true };
}

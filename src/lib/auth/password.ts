export type PasswordValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validateNewPassword(password: string): PasswordValidationResult {
  if (password.length < 12) {
    return {
      valid: false,
      message: 'A senha deve ter pelo menos 12 caracteres.',
    };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasNumber || !hasSymbol) {
    return {
      valid: false,
      message: 'A senha deve combinar letras maiúsculas, minúsculas, números e símbolos.',
    };
  }

  return { valid: true };
}

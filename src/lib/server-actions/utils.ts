import type { ZodIssue } from 'zod';

/**
 * Convert a FormData object into a plain Record<string, unknown>.
 * Replaces the repeated `formData.forEach((value, key) => { raw[key] = value; })` pattern.
 */
export function formDataToRecord(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    raw[key] = value;
  });
  return raw;
}

/**
 * Extract the first validation error message from Zod issues.
 * Replaces the repeated `parsed.error.issues[0]?.message ?? 'Dados inválidos.'` pattern.
 */
export function firstZodError(issues: ZodIssue[]): string {
  return issues[0]?.message ?? 'Dados inválidos.';
}
import type { ZodIssue, ZodType } from 'zod';

/**
 * Convert a FormData object into a plain Record<string, unknown>.
 * Keys with multiple values become arrays; single values stay scalars.
 */
export function formDataToRecord(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const key of formData.keys()) {
    const values = formData.getAll(key);
    raw[key] = values.length === 1 ? values[0] : values;
  }
  return raw;
}

/**
 * Extract the first validation error message from Zod issues.
 * Replaces the repeated `parsed.error.issues[0]?.message ?? 'Dados inválidos.'` pattern.
 */
export function firstZodError(issues: ZodIssue[]): string {
  return issues[0]?.message ?? 'Dados inválidos.';
}

export function parseFormAction<T>(
  formData: FormData,
  schema: ZodType<T>,
  preprocess: (raw: Record<string, unknown>) => unknown = (raw) => raw,
): T {
  const parsed = schema.safeParse(preprocess(formDataToRecord(formData)));
  if (!parsed.success) {
    throw new Error(firstZodError(parsed.error.issues));
  }
  return parsed.data;
}

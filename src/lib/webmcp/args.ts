export function requiredPositiveInt(value: unknown, field: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${field} inválido.`);
  }
  return parsed;
}

export function optionalPositiveInt(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requiredPositiveInt(value, field);
}

export function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} é obrigatório.`);
  }
  return value.trim();
}

export function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

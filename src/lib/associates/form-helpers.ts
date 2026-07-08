import { emptyToNull } from '@/lib/utils/strings';

function asStringList(value: unknown): string[] {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}

/**
 * Emparelha campos multi-valor do form em lista de dependentes.
 * Linhas totalmente vazias são ignoradas.
 * Linha com só um lado preenchido → erro explícito (não drop silencioso).
 */
export function pairDependentsFromForm(
  raw: Record<string, unknown>,
): Array<{ name: string; relationship: string }> {
  const names = asStringList(raw.dependentName);
  const relationships = asStringList(raw.dependentRelationship);
  const len = Math.max(names.length, relationships.length);
  const out: Array<{ name: string; relationship: string }> = [];

  for (let i = 0; i < len; i++) {
    const name = (names[i] ?? '').trim();
    const relationship = (relationships[i] ?? '').trim();
    if (!name && !relationship) continue;
    if (!name || !relationship) {
      throw new Error(
        'Cada dependente precisa de nome e parentesco. Complete ou remova as linhas incompletas.',
      );
    }
    out.push({ name, relationship });
  }
  return out;
}

/** Normaliza date-only (YYYY-MM-DD) para timestamptz ISO usado em `joinedAt`. */
export function toJoinedAtTimestamp(value: string | null | undefined): string | null {
  const raw = emptyToNull(value);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00:00Z`;
  return raw;
}

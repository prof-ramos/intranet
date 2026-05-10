/**
 * Formata uma data para exibição no padrão brasileiro (DD/MM/YYYY).
 * @param value - Data como string ISO, Date ou null
 * @returns String formatada ou '—' se nulo
 */
export function formatDate(value: string | Date | null): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString('pt-BR');
}

/**
 * Formata uma data com hora para exibição no padrão brasileiro.
 * @param value - Data como string ISO, Date ou null
 * @returns String formatada ou '—' se nulo
 */
export function formatDateTime(value: string | Date | null): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calcula quantos dias se passaram desde uma data.
 * @param value - Data como string ISO, Date ou null
 * @returns Número de dias ou null se a data for nula
 */
export function daysSince(value: string | Date | null): number | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

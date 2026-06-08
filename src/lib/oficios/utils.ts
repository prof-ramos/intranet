/**
 * Remove cargo/função do nome do signatário.
 * Nomes vêm no formato "João Silva — Presidente" ou "Maria - VP".
 * Retorna apenas a parte do nome próprio.
 */
export function cleanSignatoryName(fullName: string): string {
  const cleaned = fullName.replace(/\s*(?:—|–|-)\s*.*$/, '').trim();
  return cleaned || fullName.trim();
}

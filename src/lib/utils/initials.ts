/**
 * Extract initials from a full name (first letter of first two name parts).
 * "Joao Silva" → "JS", "Maria" → "M", "" → ""
 */
export function initialsFromName(name: string | null | undefined): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === '') return '';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';
  return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase();
}

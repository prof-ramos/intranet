/**
 * Escapes special characters in a string for use as a PostgreSQL LIKE pattern.
 *
 * Escapes in order: backslash first (to avoid double-escaping),
 * then underscore, then percent — matching the conventional `escape '\\'`
 * clause used with PostgreSQL's LIKE/ILIKE.
 *
 * Callers are responsible for wrapping the result with wildcards (e.g. `%...%`).
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/_/g, '\\_').replace(/%/g, '\\%');
}

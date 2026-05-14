/**
 * Shared PII sanitization module.
 *
 * Recursively redacts values of sensitive keys (CPF, SIAPE, email, etc.)
 * before persisting to audit logs, webhook payloads, or any other output
 * where personally identifiable information must not appear in plaintext.
 */

export const SENSITIVE_KEY_PATTERN =
  /cpf|siape|email|address|endereco|phone|telefone|whatsapp|secret|token|password|sourcePayload|primaryEmail/i;

/**
 * Recursively sanitize an arbitrary value by redacting string values
 * whose keys match `SENSITIVE_KEY_PATTERN`.
 *
 * - Primitives are returned as-is (string values of sensitive keys are
 *   replaced with `[REDACTED]` by the caller that owns the key).
 * - Objects and arrays are traversed recursively.
 * - Circular references are replaced with `"[circular]"`.
 */
export function sanitizePiiValue(value: unknown, visited?: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'function' || typeof value === 'symbol') {
    return null;
  }

  if (typeof value !== 'object') {
    return value;
  }

  const seen = visited ?? new WeakSet<object>();

  if (seen.has(value)) {
    return '[circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePiiValue(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : sanitizePiiValue(entry, seen),
    ]),
  );
}
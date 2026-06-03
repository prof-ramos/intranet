/**
 * Shared PII sanitization module.
 *
 * Recursively redacts values of sensitive keys (CPF, SIAPE, email, etc.)
 * before persisting to audit logs, webhook payloads, or any other output
 * where personally identifiable information must not appear in plaintext.
 */

export const SENSITIVE_KEY_PATTERN =
  /cpf|siape|email|address|endereco|phone|telefone|whatsapp|secret|token|password|sourcePayload|primaryEmail|reset_?link|recovery_?link|apiKey|authorization|ciphertext/i;

export const PII_TEXT_PATTERNS: Array<[RegExp, string]> = [
  [/\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g, '[email]'],
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]'],
  [/https?:\/\/\S+/g, '[url]'],
  [/Bearer\s+\S+/gi, 'Bearer [token]'],
];

/**
 * Redact PII (emails, CPFs, URLs, bearer tokens) from an arbitrary string.
 * For object/array values, use `sanitizePiiValue` instead.
 */
export function redactPiiString(text: string): string {
  let safe = text;
  for (const [pattern, replacement] of PII_TEXT_PATTERNS) {
    safe = safe.replace(pattern, replacement);
  }
  return safe;
}

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

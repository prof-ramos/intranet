import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison that resists timing attacks.
 *
 * Both strings are padded to equal length before comparison so that
 * `timingSafeEqual` always processes the same number of bytes regardless
 * of how much of the strings match. The length check is performed after
 * the constant-time comparison to avoid leaking length differences.
 */
export function safeCompare(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  const maxLength = Math.max(expectedBuffer.length, actualBuffer.length, 1);
  const paddedExpected = Buffer.alloc(maxLength);
  const paddedActual = Buffer.alloc(maxLength);
  expectedBuffer.copy(paddedExpected);
  actualBuffer.copy(paddedActual);
  const matches = timingSafeEqual(paddedExpected, paddedActual);
  return matches && expectedBuffer.length === actualBuffer.length;
}
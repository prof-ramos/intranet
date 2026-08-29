const MAX_RETRIES = 3;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /unique constraint|duplicate key/i.test(error.message);
}

export async function retryOnUniqueViolation<T>(
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === maxRetries) {
        throw error;
      }

      await new Promise((r) => setTimeout(r, 50 * attempt));
    }
  }

  throw new Error('unreachable');
}

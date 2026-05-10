import { headers } from 'next/headers';

export async function getClientIp(requestHeaders?: Headers): Promise<string> {
  const h = requestHeaders ?? await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  const realIp = h.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

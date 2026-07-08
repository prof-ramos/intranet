import 'server-only';
import { z } from 'zod';
import { isIPv6 } from 'node:net';
import { lookup } from 'node:dns/promises';
import { domainEventType } from '@/lib/db/schema/integrations';

const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^192\.0\.0\./,
  /^192\.0\.2\./,
  /^198\.18\./,
  /^198\.19\./,
  /^198\.51\.100\./,
  /^203\.0\.113\./,
  /^(22[4-9]|23\d)\./,
  /^24[0-9]\./,
  /^25[0-5]\./,
];

function isPrivateIPv6(ip: string): boolean {
  // ::1 loopback
  if (ip === '::1') return true;
  // fc00::/7 Unique Local Addresses (ULA)
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
  // fe80::/10 link-local
  if (ip.startsWith('fe80')) return true;
  // 64:ff9b::/96 NAT64 / Well-Known Prefix
  if (ip.startsWith('64:ff9b')) return true;
  // ::ffff:x (IPv4-mapped) — Node URL normalizes to hex form ::ffff:aabb:ccdd
  if (ip.startsWith('::ffff:')) {
    const embedded = ip.slice(7);
    // Hex-form like "7f00:1" from URL normalization
    if (/^[0-9a-f]{1,4}:[0-9a-f]{1,4}$/i.test(embedded)) {
      const parts = embedded.split(':');
      const a = Number.parseInt(parts[0], 16);
      const b = Number.parseInt(parts[1], 16);
      const dotted = `${(a >> 8) & 0xff}.${a & 0xff}.${(b >> 8) & 0xff}.${b & 0xff}`;
      if (PRIVATE_IPV4_RANGES.some((p) => p.test(dotted))) return true;
    }
    // Fallback: dotted decimal (pre-normalization input)
    if (/^\d+\.\d+\.\d+\.\d+$/.test(embedded)) {
      if (PRIVATE_IPV4_RANGES.some((p) => p.test(embedded))) return true;
    }
  }
  return false;
}

export async function isPublicWebhookUrl(value: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:') {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return false;
  }

  // Strip brackets for IPv6 — URL.hostname includes them
  const stripped = hostname.replace(/^\[|\]$/g, '');

  // Direct IPv6 address (includes ::ffff: mapped — handled in isPrivateIPv6)
  if (isIPv6(stripped)) {
    return !isPrivateIPv6(stripped);
  }

  // Direct IPv4 address
  if (PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(hostname))) {
    return false;
  }

  // DNS rebinding guard: resolve hostname, reject if any resolved IP is private
  try {
    // ponytail: 2s timeout via race, no cache. Per-subscription cache if throughput matters.
    const addresses = await Promise.race([
      lookup(hostname, { all: true }) as Promise<Array<{ address: string; family: number }>>,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DNS timeout')), 2000),
      ),
    ]);
    for (const { address } of addresses) {
      if (isIPv6(address)) {
        if (isPrivateIPv6(address)) return false;
      } else if (PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(address))) {
        return false;
      }
    }
  } catch {
    return false;
  }

  return true;
}

export const webhookSubscriptionFormSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(120),
  targetUrl: z
    .string()
    .trim()
    .url('URL de destino inválida.')
    .superRefine(async (val, ctx) => {
      if (!(await isPublicWebhookUrl(val))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'A URL deve usar HTTPS público; hosts locais, privados ou reservados não são permitidos.',
        });
      }
    }),
  subscribedEvents: z
    .array(z.enum(domainEventType.enumValues))
    .min(1, 'Selecione ao menos um evento.'),
});

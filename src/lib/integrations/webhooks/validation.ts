import 'server-only';
import { z } from 'zod';
import { isIP, isIPv6 } from 'node:net';
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
  const normalizedIp = ip.toLowerCase();
  // ::/128 unspecified and ::1 loopback
  if (normalizedIp === '::' || normalizedIp === '::1') return true;
  // fc00::/7 Unique Local Addresses (ULA)
  if (normalizedIp.startsWith('fc') || normalizedIp.startsWith('fd')) return true;
  // ff00::/8 multicast
  if (normalizedIp.startsWith('ff')) return true;
  // fe80::/10 link-local
  const firstHextet = Number.parseInt(normalizedIp.split(':', 1)[0], 16);
  if ((firstHextet & 0xffc0) === 0xfe80) return true;
  // 64:ff9b::/96 NAT64 / Well-Known Prefix
  if (normalizedIp.startsWith('64:ff9b')) return true;
  // IPv4-mapped/compatible — Node URL normalizes the IPv4 tail to hex hextets
  const embeddedPrefix = normalizedIp.startsWith('::ffff:')
    ? '::ffff:'
    : normalizedIp.startsWith('::')
      ? '::'
      : null;
  if (embeddedPrefix) {
    const embedded = normalizedIp.slice(embeddedPrefix.length);
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

export interface ValidatedWebhookAddress {
  address: string;
  family: 4 | 6;
}

export interface ValidatedWebhookTarget {
  url: string;
  hostname: string;
  addresses: ValidatedWebhookAddress[];
}

function isPublicAddress({ address, family }: ValidatedWebhookAddress): boolean {
  if (family === 6) {
    return isIPv6(address) && !isPrivateIPv6(address);
  }

  return isIP(address) === 4 && !PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(address));
}

export async function resolvePublicWebhookTarget(
  value: string,
): Promise<ValidatedWebhookTarget | null> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return null;
  }

  // Strip brackets for IPv6 — URL.hostname includes them
  const stripped = hostname.replace(/^\[|\]$/g, '');

  // Direct IPv6 address (includes ::ffff: mapped — handled in isPrivateIPv6)
  if (isIPv6(stripped)) {
    const addresses: ValidatedWebhookAddress[] = [{ address: stripped, family: 6 }];
    return isPublicAddress(addresses[0]) ? { url: url.href, hostname: stripped, addresses } : null;
  }

  // Direct IPv4 address
  if (isIP(stripped) === 4) {
    const addresses: ValidatedWebhookAddress[] = [{ address: stripped, family: 4 }];
    return isPublicAddress(addresses[0]) ? { url: url.href, hostname: stripped, addresses } : null;
  }

  // DNS rebinding guard: resolve hostname, reject if any resolved IP is private
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const resolved = await Promise.race([
      lookup(hostname, { all: true }) as Promise<Array<{ address: string; family: number }>>,
      new Promise<never>(
        (_, reject) => (timeout = setTimeout(() => reject(new Error('DNS timeout')), 2000)),
      ),
    ]);

    const addresses = resolved.flatMap<ValidatedWebhookAddress>(({ address, family }) =>
      family === 4 || family === 6 ? [{ address, family }] : [],
    );
    if (addresses.length === 0 || addresses.length !== resolved.length) {
      return null;
    }

    return addresses.every(isPublicAddress) ? { url: url.href, hostname, addresses } : null;
  } catch {
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function isPublicWebhookUrl(value: string): Promise<boolean> {
  return (await resolvePublicWebhookTarget(value)) !== null;
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

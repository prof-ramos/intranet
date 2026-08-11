import 'server-only';
import type { LookupFunction } from 'node:net';
import { Agent, fetch as undiciFetch, type RequestInit } from 'undici';
import type {
  ValidatedWebhookAddress,
  ValidatedWebhookTarget,
} from '@/lib/integrations/webhooks/validation';

const MAX_WEBHOOK_RESPONSE_BYTES = 64 * 1024;

export interface PinnedWebhookResponse {
  ok: boolean;
  status: number;
  type: ResponseType;
  body: string;
}

function createPinnedLookup(addresses: ValidatedWebhookAddress[]): LookupFunction {
  return ((
    _hostname: string,
    options: { family?: number; all?: boolean },
    callback: (...args: unknown[]) => void,
  ) => {
    const matching = options.family
      ? addresses.filter(({ family }) => family === options.family)
      : addresses;
    const selected = matching.length > 0 ? matching : addresses;

    if (options.all) {
      callback(null, selected);
      return;
    }

    const [first] = selected;
    callback(null, first.address, first.family);
  }) as LookupFunction;
}

async function readResponseTextWithinLimit(response: {
  headers: { get(name: string): string | null };
  body: ReadableStream<Uint8Array> | null;
}): Promise<string> {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength && Number(declaredLength) > MAX_WEBHOOK_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => {});
    throw new Error('Webhook response exceeds the allowed size.');
  }

  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_WEBHOOK_RESPONSE_BYTES) {
        await reader.cancel().catch(() => {});
        throw new Error('Webhook response exceeds the allowed size.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function sendPinnedWebhook(
  target: ValidatedWebhookTarget,
  init: Omit<RequestInit, 'dispatcher'>,
): Promise<PinnedWebhookResponse> {
  const dispatcher = new Agent({
    connect: {
      lookup: createPinnedLookup(target.addresses),
    },
  });

  try {
    const response = await undiciFetch(target.url, {
      ...init,
      dispatcher,
    });

    if (response.status >= 300 && response.status < 400) {
      if (response.body) {
        await response.body.cancel().catch(() => {});
      }

      return {
        ok: response.ok,
        status: response.status,
        type: response.type,
        body: '',
      };
    }

    return {
      ok: response.ok,
      status: response.status,
      type: response.type,
      body: await readResponseTextWithinLimit(
        response as unknown as Parameters<typeof readResponseTextWithinLimit>[0],
      ),
    };
  } finally {
    await dispatcher.close();
  }
}

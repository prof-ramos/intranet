import 'server-only';
import type { LookupFunction } from 'node:net';
import { Agent, fetch as undiciFetch, type RequestInit } from 'undici';
import type {
  ValidatedWebhookAddress,
  ValidatedWebhookTarget,
} from '@/lib/integrations/webhooks/validation';

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

    return {
      ok: response.ok,
      status: response.status,
      type: response.type,
      body: await response.text(),
    };
  } finally {
    await dispatcher.close();
  }
}

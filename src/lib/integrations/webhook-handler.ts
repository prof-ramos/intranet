import { safeCompare } from '@/lib/crypto/safe-compare';

type WebhookAuthResult<TAuth> = { ok: true; context: TAuth } | { ok: false; response: Response };

export interface WebhookHandlerOptions<TPayload, TAuth = undefined> {
  authenticate?: (request: Request) => Promise<WebhookAuthResult<TAuth>> | WebhookAuthResult<TAuth>;
  parse: (request: Request, context: { auth: TAuth }) => Promise<TPayload>;
  handle: (payload: TPayload, context: { request: Request; auth: TAuth }) => Promise<Response>;
  catchHandleErrors?: boolean;
  onError?: (
    error: unknown,
    request: Request,
    context: { auth: TAuth | undefined },
  ) => Promise<Response> | Response;
}

export function createWebhookHandler<TPayload, TAuth = undefined>(
  options: WebhookHandlerOptions<TPayload, TAuth>,
) {
  return async function webhookHandler(request: Request): Promise<Response> {
    const auth = options.authenticate
      ? await options.authenticate(request)
      : ({ ok: true, context: undefined as TAuth } satisfies WebhookAuthResult<TAuth>);

    if (!auth.ok) {
      return auth.response;
    }

    let payload: TPayload;
    try {
      payload = await options.parse(request, { auth: auth.context });
    } catch (error) {
      if (options.onError) {
        return options.onError(error, request, { auth: auth.context });
      }
      throw error;
    }

    if (!options.catchHandleErrors) {
      return options.handle(payload, { request, auth: auth.context });
    }

    try {
      return await options.handle(payload, { request, auth: auth.context });
    } catch (error) {
      if (options.onError) {
        return options.onError(error, request, { auth: auth.context });
      }
      throw error;
    }
  };
}

export async function parseJsonWebhook<TPayload>(request: Request): Promise<TPayload> {
  return request.json() as Promise<TPayload>;
}

export function requireSecretHeader(options: {
  request: Request;
  secret: string | undefined;
  headerName: string;
  missingSecretResponse: Response | (() => Response);
  unauthorizedResponse: Response | (() => Response);
}): WebhookAuthResult<undefined> {
  if (!options.secret) {
    return {
      ok: false,
      response:
        typeof options.missingSecretResponse === 'function'
          ? options.missingSecretResponse()
          : options.missingSecretResponse,
    };
  }

  const providedSecret = options.request.headers.get(options.headerName);
  if (!providedSecret || !safeCompare(options.secret, providedSecret)) {
    return {
      ok: false,
      response:
        typeof options.unauthorizedResponse === 'function'
          ? options.unauthorizedResponse()
          : options.unauthorizedResponse,
    };
  }

  return { ok: true, context: undefined };
}

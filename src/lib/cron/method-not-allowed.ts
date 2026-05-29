import { getRequestId, jsonMethodNotAllowed } from '@/lib/integrations/http';

export function createMethodNotAllowedHandlers(allowedMethods: readonly string[]) {
  const handler = (request: Request) =>
    jsonMethodNotAllowed(allowedMethods, {
      requestId: request.headers.get('x-request-id') ?? undefined,
    });

  return {
    POST: handler,
    PUT: handler,
    PATCH: handler,
    DELETE: handler,
  };
}

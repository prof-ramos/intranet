import { describe, expect, it, vi } from 'vitest';
import { createWebhookHandler, parseJsonWebhook, requireSecretHeader } from './webhook-handler';

describe('createWebhookHandler', () => {
  it('short-circuits when authentication returns a response', async () => {
    const handle = vi.fn();
    const handler = createWebhookHandler({
      authenticate: () => ({
        ok: false,
        response: Response.json({ error: 'no' }, { status: 401 }),
      }),
      parse: parseJsonWebhook,
      handle,
    });

    const response = await handler(new Request('http://localhost/webhook', { method: 'POST' }));

    expect(response.status).toBe(401);
    expect(handle).not.toHaveBeenCalled();
  });

  it('propagates authentication exceptions instead of mapping them as payload errors', async () => {
    const handler = createWebhookHandler({
      authenticate: () => {
        throw new Error('rate limiter unavailable');
      },
      parse: parseJsonWebhook,
      handle: async () => Response.json({ ok: true }),
      onError: () => Response.json({ error: 'bad payload' }, { status: 400 }),
    });

    await expect(handler(new Request('http://localhost/webhook'))).rejects.toThrow(
      'rate limiter unavailable',
    );
  });

  it('passes parsed payload and auth context to the handler', async () => {
    const handler = createWebhookHandler({
      authenticate: () => ({ ok: true, context: { principal: 'api-key' } }),
      parse: parseJsonWebhook<{ id: number }>,
      handle: async (payload, context) =>
        Response.json({ id: payload.id, principal: context.auth.principal }),
    });

    const response = await handler(
      new Request('http://localhost/webhook', {
        method: 'POST',
        body: JSON.stringify({ id: 7 }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: 7, principal: 'api-key' });
  });

  it('lets parsers reuse an authenticated body carried only in the auth context', async () => {
    const request = new Request('http://localhost/webhook', {
      method: 'POST',
      body: '{"id":7}',
    });
    const textSpy = vi.spyOn(request, 'text');
    const handler = createWebhookHandler({
      authenticate: async (authenticatedRequest) => ({
        ok: true,
        context: { verifiedBody: await authenticatedRequest.text() },
      }),
      parse: async (_request, { auth }) => JSON.parse(auth.verifiedBody) as { id: number },
      handle: async (payload) => Response.json(payload),
    });

    const response = await handler(request);

    await expect(response.json()).resolves.toEqual({ id: 7 });
    expect(textSpy).toHaveBeenCalledOnce();
  });

  it('delegates errors to onError', async () => {
    const handler = createWebhookHandler({
      parse: async () => {
        throw new Error('bad payload');
      },
      handle: async () => Response.json({ ok: true }),
      onError: () => Response.json({ error: 'bad' }, { status: 400 }),
    });

    const response = await handler(new Request('http://localhost/webhook', { method: 'POST' }));

    expect(response.status).toBe(400);
  });

  it('propagates handler errors by default', async () => {
    const handler = createWebhookHandler({
      parse: async () => ({ ok: true }),
      handle: async () => {
        throw new Error('dispatch failed');
      },
      onError: () => Response.json({ error: 'bad' }, { status: 400 }),
    });

    await expect(handler(new Request('http://localhost/webhook'))).rejects.toThrow(
      'dispatch failed',
    );
  });

  it('can delegate handler errors to onError explicitly', async () => {
    const handler = createWebhookHandler({
      parse: async () => ({ ok: true }),
      catchHandleErrors: true,
      handle: async () => {
        throw new Error('provider payload failed');
      },
      onError: () => Response.json({ error: 'bad' }, { status: 500 }),
    });

    const response = await handler(new Request('http://localhost/webhook'));

    expect(response.status).toBe(500);
  });
});

describe('requireSecretHeader', () => {
  it('rejects missing configured secret', () => {
    const result = requireSecretHeader({
      request: new Request('http://localhost/webhook'),
      secret: undefined,
      headerName: 'X-Webhook-Secret',
      missingSecretResponse: Response.json({}, { status: 503 }),
      unauthorizedResponse: Response.json({}, { status: 401 }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(503);
  });

  it('rejects missing or wrong request secret', () => {
    const result = requireSecretHeader({
      request: new Request('http://localhost/webhook'),
      secret: 'expected',
      headerName: 'X-Webhook-Secret',
      missingSecretResponse: Response.json({}, { status: 503 }),
      unauthorizedResponse: Response.json({}, { status: 401 }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it('accepts matching request secret', () => {
    const result = requireSecretHeader({
      request: new Request('http://localhost/webhook', {
        headers: { 'X-Webhook-Secret': 'expected' },
      }),
      secret: 'expected',
      headerName: 'X-Webhook-Secret',
      missingSecretResponse: Response.json({}, { status: 503 }),
      unauthorizedResponse: Response.json({}, { status: 401 }),
    });

    expect(result).toEqual({ ok: true, context: undefined });
  });
});

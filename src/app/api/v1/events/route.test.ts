import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';
import { DELETE, GET, PATCH, POST, PUT } from './route';

const mockAuthorizeIntegrationRequest = vi.fn();
const mockConsume = vi.fn();
const mockDispatchDomainEventById = vi.fn();
const mockDispatchPendingDomainEvents = vi.fn();
const auditValues = vi.fn();

vi.mock('@/lib/integrations/auth', () => ({
  authorizeIntegrationRequest: (...args: unknown[]) => mockAuthorizeIntegrationRequest(...args),
}));

vi.mock('@/lib/integrations/rate-limit', () => ({
  getClientIp: () => '127.0.0.1',
  integrationRateLimiter: {
    consume: (...args: unknown[]) => mockConsume(...args),
  },
}));

vi.mock('@/lib/integrations/webhooks/service', () => ({
  dispatchDomainEventById: (...args: unknown[]) => mockDispatchDomainEventById(...args),
  dispatchPendingDomainEvents: (...args: unknown[]) => mockDispatchPendingDomainEvents(...args),
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(() => ({ values: auditValues })),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  auditLogs: {},
}));

describe('/api/v1/events route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsume.mockResolvedValue({ allowed: true });
    mockAuthorizeIntegrationRequest.mockResolvedValue({
      ok: true,
      requestId: 'events-request',
      principal: { kind: 'session', userId: 7 },
    });
    mockDispatchDomainEventById.mockResolvedValue({ dispatched: true, eventId: 99 });
    mockDispatchPendingDomainEvents.mockResolvedValue({ processed: 2 });
    auditValues.mockResolvedValue(undefined);
  });

  it('returns operator metadata on GET', async () => {
    const response = await GET(new Request('https://asof.local/api/v1/events'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      data: {
        stream: 'events',
        implemented: true,
        direction: 'outbound-only',
      },
      meta: {
        requestId: 'events-request',
      },
    });
  });

  it('dispatches a single event on POST with eventId', async () => {
    mockDispatchDomainEventById.mockResolvedValue({ dispatched: false, reason: 'not_dispatchable' });
    const response = await POST(
      new Request('https://asof.local/api/v1/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventId: 99 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockDispatchDomainEventById).toHaveBeenCalledWith(99);
    expect(body.data.mode).toBe('single');
    expect(body.data.result).toEqual({ dispatched: false, reason: 'not_dispatchable' });
  });

  it('dispatches a batch when no eventId is provided', async () => {
    const response = await POST(
      new Request('https://asof.local/api/v1/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockDispatchPendingDomainEvents).toHaveBeenCalledWith(10);
    expect(body.data.mode).toBe('batch');
  });

  it('returns 400 for invalid payload', async () => {
    const response = await POST(
      new Request('https://asof.local/api/v1/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 999 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('invalid_request');
  });

  it('logs a safe audit error without failing dispatch', async () => {
    const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    auditValues.mockRejectedValue(Object.assign(new Error('email=user@example.com'), { code: 'E_AUDIT' }));

    const response = await POST(
      new Request('https://asof.local/api/v1/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventId: 99 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.mode).toBe('single');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[events-route] failed to persist audit log', {
      action: 'domain_event_dispatch_single',
      eventId: 99,
      error: {
        kind: 'error',
        name: 'Error',
        code: 'E_AUDIT',
        digest: undefined,
      },
    });
    consoleErrorSpy.mockRestore();
  });

  it('returns method not allowed for PUT/PATCH/DELETE', async () => {
    const put = await PUT(new Request('https://asof.local/api/v1/events', { headers: { 'x-request-id': 'req-1' } }));
    const patch = await PATCH(new Request('https://asof.local/api/v1/events', { headers: { 'x-request-id': 'req-2' } }));
    const del = await DELETE(new Request('https://asof.local/api/v1/events', { headers: { 'x-request-id': 'req-3' } }));

    expect(put.status).toBe(405);
    expect(patch.status).toBe(405);
    expect(del.status).toBe(405);
  });
});

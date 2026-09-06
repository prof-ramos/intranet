import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

const mockAuthorizeIntegrationRequest = vi.fn();
const mockDispatchPendingDomainEvents = vi.fn();
const auditValues = vi.fn();

vi.mock('@/lib/env', () => ({
  env: {
    CRON_SECRET: 'cron-secret',
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(() => ({ values: auditValues })),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  auditLogs: {},
}));

vi.mock('@/lib/integrations/verify-request', () => ({
  authorizeIntegrationRequest: (...args: unknown[]) => mockAuthorizeIntegrationRequest(...args),
}));

vi.mock('@/lib/integrations/webhooks/service', () => ({
  dispatchPendingDomainEvents: (...args: unknown[]) => mockDispatchPendingDomainEvents(...args),
}));

describe('/api/v1/events/dispatch route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditValues.mockResolvedValue(undefined);
    mockDispatchPendingDomainEvents.mockResolvedValue({
      processed: 1,
      results: [{ dispatched: true, eventId: 123, subscriptions: 1, results: ['delivered'] }],
    });
    mockAuthorizeIntegrationRequest.mockResolvedValue({
      ok: true,
      requestId: 'session-request',
      principal: {
        kind: 'session',
        userId: 7,
      },
    });
  });

  it('accepts Vercel Cron bearer authorization and dispatches pending events', async () => {
    const response = await GET(
      new Request('https://asof.local/api/v1/events/dispatch?limit=3', {
        headers: {
          authorization: 'Bearer cron-secret',
          'x-request-id': 'cron-request',
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockAuthorizeIntegrationRequest).not.toHaveBeenCalled();
    expect(mockDispatchPendingDomainEvents).toHaveBeenCalledWith(3);
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'domain_event_dispatch_scheduled',
        entityType: 'domain_event',
        performedBy: null,
      }),
    );
    expect(body).toMatchObject({
      ok: true,
      data: {
        mode: 'scheduled',
        result: {
          processed: 1,
        },
      },
      meta: {
        requestId: 'cron-request',
      },
    });
  });

  it('rejects requests without cron bearer authorization', async () => {
    const response = await GET(new Request('https://asof.local/api/v1/events/dispatch'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(mockAuthorizeIntegrationRequest).not.toHaveBeenCalled();
    expect(mockDispatchPendingDomainEvents).not.toHaveBeenCalled();
    expect(auditValues).not.toHaveBeenCalled();
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: 'unauthorized',
      },
    });
  });

  it('rejects an invalid cron bearer token before dispatching', async () => {
    const response = await GET(
      new Request('https://asof.local/api/v1/events/dispatch', {
        headers: {
          authorization: 'Bearer wrong-secret',
          'x-request-id': 'bad-request',
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(mockDispatchPendingDomainEvents).not.toHaveBeenCalled();
    expect(auditValues).not.toHaveBeenCalled();
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: 'unauthorized',
      },
      meta: {
        requestId: 'bad-request',
      },
    });
  });

  it('rejects invalid limit values', async () => {
    const response = await GET(
      new Request('https://asof.local/api/v1/events/dispatch?limit=500', {
        headers: {
          authorization: 'Bearer cron-secret',
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(mockDispatchPendingDomainEvents).not.toHaveBeenCalled();
  });

  it('rejects non-decimal limit encodings', async () => {
    const response = await GET(
      new Request('https://asof.local/api/v1/events/dispatch?limit=1e2', {
        headers: {
          authorization: 'Bearer cron-secret',
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(mockDispatchPendingDomainEvents).not.toHaveBeenCalled();
    expect(auditValues).not.toHaveBeenCalled();
  });

  it('does not allow POST', async () => {
    const response = await POST(new Request('https://asof.local/api/v1/events/dispatch'));
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
    expect(body.error.code).toBe('method_not_allowed');
  });
});

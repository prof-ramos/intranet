import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET, POST } from './route';

const mockAutoMarkOverduePaymentsService = vi.fn();

vi.mock('@/lib/env', () => ({
  env: {
    CRON_SECRET: 'cron-secret',
  },
}));

vi.mock('@/lib/finance/service', () => ({
  autoMarkOverduePaymentsService: (...args: unknown[]) =>
    mockAutoMarkOverduePaymentsService(...args),
}));

describe('/api/v1/cron/overdue-payments route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAutoMarkOverduePaymentsService.mockResolvedValue(5);
  });

  it('accepts Vercel Cron bearer authorization and marks overdue payments', async () => {
    const response = await GET(
      new Request('https://asof.local/api/v1/cron/overdue-payments', {
        headers: {
          authorization: 'Bearer cron-secret',
          'x-request-id': 'cron-request',
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockAutoMarkOverduePaymentsService).toHaveBeenCalled();
    expect(body).toMatchObject({
      ok: true,
      data: {
        mode: 'scheduled',
        result: {
          transitionedCount: 5,
        },
      },
      meta: {
        requestId: 'cron-request',
      },
    });
  });

  it('rejects requests without cron bearer authorization', async () => {
    const response = await GET(new Request('https://asof.local/api/v1/cron/overdue-payments'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(mockAutoMarkOverduePaymentsService).not.toHaveBeenCalled();
    expect(body.error.code).toBe('unauthorized');
  });

  it('does not allow unsafe HTTP methods', async () => {
    const post = await POST(new Request('https://asof.local/api/v1/cron/overdue-payments'));
    const del = await DELETE(new Request('https://asof.local/api/v1/cron/overdue-payments'));

    expect(post.status).toBe(405);
    expect(post.headers.get('allow')).toBe('GET');
    expect(del.status).toBe(405);
    expect(del.headers.get('allow')).toBe('GET');
  });
});
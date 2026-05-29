import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET, POST } from './route';

const mockCheckAndEmitLgpdRetentionActivities = vi.fn();

vi.mock('@/lib/env', () => ({
  env: {
    CRON_SECRET: 'cron-secret',
  },
}));

vi.mock('@/lib/lgpd/retention', () => ({
  checkAndEmitLgpdRetentionActivities: (...args: unknown[]) =>
    mockCheckAndEmitLgpdRetentionActivities(...args),
}));

describe('/api/v1/cron/lgpd-retention route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckAndEmitLgpdRetentionActivities.mockResolvedValue({ createdCount: 2 });
  });

  it('accepts Vercel Cron bearer authorization and runs the LGPD retention watchdog', async () => {
    const response = await GET(
      new Request('https://asof.local/api/v1/cron/lgpd-retention?limit=3', {
        headers: {
          authorization: 'Bearer cron-secret',
          'x-request-id': 'cron-request',
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockCheckAndEmitLgpdRetentionActivities).toHaveBeenCalledWith({ limit: 3 });
    expect(body).toMatchObject({
      ok: true,
      data: {
        mode: 'scheduled',
        result: {
          createdCount: 2,
        },
      },
      meta: {
        requestId: 'cron-request',
      },
    });
  });

  it('rejects requests without cron bearer authorization', async () => {
    const response = await GET(new Request('https://asof.local/api/v1/cron/lgpd-retention'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(mockCheckAndEmitLgpdRetentionActivities).not.toHaveBeenCalled();
    expect(body.error.code).toBe('unauthorized');
  });

  it('rejects invalid limit values before running retention checks', async () => {
    const response = await GET(
      new Request('https://asof.local/api/v1/cron/lgpd-retention?limit=1e2', {
        headers: {
          authorization: 'Bearer cron-secret',
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(mockCheckAndEmitLgpdRetentionActivities).not.toHaveBeenCalled();
  });

  it('does not allow unsafe HTTP methods', async () => {
    const post = await POST(new Request('https://asof.local/api/v1/cron/lgpd-retention'));
    const del = await DELETE(new Request('https://asof.local/api/v1/cron/lgpd-retention'));

    expect(post.status).toBe(405);
    expect(post.headers.get('allow')).toBe('GET');
    expect(del.status).toBe(405);
    expect(del.headers.get('allow')).toBe('GET');
  });
});

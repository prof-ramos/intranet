import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

const routeMocks = vi.hoisted(() => ({
  checkAndEmitSlaWarnings: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  env: {
    CRON_SECRET: 'cron-secret',
  },
}));

vi.mock('@/lib/juridico/sla-notifications', () => ({
  checkAndEmitSlaWarnings: (...args: unknown[]) => routeMocks.checkAndEmitSlaWarnings(...args),
}));

describe('/api/v1/juridico/sla-warnings route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.checkAndEmitSlaWarnings.mockResolvedValue({
      scanned: 1,
      eligible: 1,
      emitted: 1,
      skipped: 0,
      failed: 0,
      limit: 5,
      failures: [],
    });
  });

  it('runs the SLA warning job with cron bearer authorization', async () => {
    const response = await GET(
      new Request('https://asof.local/api/v1/juridico/sla-warnings?limit=5', {
        headers: {
          authorization: 'Bearer cron-secret',
          'x-request-id': 'sla-request',
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(routeMocks.checkAndEmitSlaWarnings).toHaveBeenCalledWith({ limit: 5 });
    expect(body).toMatchObject({
      ok: true,
      data: {
        mode: 'scheduled',
        result: {
          emitted: 1,
          failed: 0,
        },
      },
      meta: {
        requestId: 'sla-request',
      },
    });
  });

  it('rejects invalid cron bearer authorization before running the job', async () => {
    const response = await GET(
      new Request('https://asof.local/api/v1/juridico/sla-warnings', {
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(routeMocks.checkAndEmitSlaWarnings).not.toHaveBeenCalled();
    expect(body.error.code).toBe('unauthorized');
  });

  it('rejects invalid limits', async () => {
    const response = await GET(
      new Request('https://asof.local/api/v1/juridico/sla-warnings?limit=1000', {
        headers: {
          authorization: 'Bearer cron-secret',
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(routeMocks.checkAndEmitSlaWarnings).not.toHaveBeenCalled();
  });

  it('does not allow POST', async () => {
    const response = await POST(new Request('https://asof.local/api/v1/juridico/sla-warnings'));
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
    expect(body.error.code).toBe('method_not_allowed');
  });
});

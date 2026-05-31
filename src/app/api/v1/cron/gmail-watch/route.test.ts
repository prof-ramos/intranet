import { NextResponse } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/cron/auth', () => ({
  authorizeCronRequest: vi.fn().mockReturnValue({
    ok: true,
    requestId: 'test-request-id',
  }),
}));

vi.mock('@/lib/email-triage/gmail', () => ({
  getGmailAccessToken: vi.fn().mockResolvedValue('mock-token'),
  watchGmail: vi.fn().mockResolvedValue({
    historyId: '12345',
    expiration: '1234567890',
  }),
}));

vi.mock('@/lib/env', () => ({
  env: {
    GMAIL_WATCH_TOPIC: 'projects/test/topics/gmail-inbox',
  },
}));

describe('POST /api/v1/cron/gmail-watch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 for valid cron request', async () => {
    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/v1/cron/gmail-watch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': 'test-secret',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.data.status).toBe('ok');
  });

  it('returns 401 for invalid cron secret', async () => {
    const { authorizeCronRequest } = await import('@/lib/cron/auth');
    vi.mocked(authorizeCronRequest).mockReturnValue({
      ok: false,
      response: NextResponse.json({ ok: false, error: { code: 'unauthorized', message: 'Unauthorized' } }, { status: 401 }) as unknown as NonNullable<ReturnType<typeof authorizeCronRequest>['response']>,
    });

    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/v1/cron/gmail-watch', {
      method: 'POST',
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});

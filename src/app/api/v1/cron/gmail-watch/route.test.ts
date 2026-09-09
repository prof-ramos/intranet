import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET, POST } from './route';

const mockWatchGmail = vi.fn();
const mockGetGmailAccessToken = vi.fn();

vi.mock('@/lib/env', () => ({
  env: {
    CRON_SECRET: 'cron-secret',
  },
}));

vi.mock('@/lib/email-triage/gmail', () => ({
  getGmailAccessToken: (...args: unknown[]) => mockGetGmailAccessToken(...args),
  watchGmail: (...args: unknown[]) => mockWatchGmail(...args),
}));

describe('/api/v1/cron/gmail-watch route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts Vercel Cron bearer authorization and skips while webhook is deactivated', async () => {
    const response = await GET(
      new Request('https://asof.local/api/v1/cron/gmail-watch', {
        headers: {
          authorization: 'Bearer cron-secret',
          'x-request-id': 'cron-request',
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockWatchGmail).not.toHaveBeenCalled();
    expect(mockGetGmailAccessToken).not.toHaveBeenCalled();
    expect(body).toMatchObject({
      ok: true,
      data: {
        mode: 'scheduled',
        skipped: 'gmail_webhook_deactivated',
      },
      meta: {
        requestId: 'cron-request',
      },
    });
  });

  it('rejects requests without cron bearer authorization', async () => {
    const response = await GET(new Request('https://asof.local/api/v1/cron/gmail-watch'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(mockWatchGmail).not.toHaveBeenCalled();
    expect(body.error.code).toBe('unauthorized');
  });

  it('does not allow unsafe HTTP methods', async () => {
    const post = await POST(new Request('https://asof.local/api/v1/cron/gmail-watch'));
    const del = await DELETE(new Request('https://asof.local/api/v1/cron/gmail-watch'));

    expect(post.status).toBe(405);
    expect(post.headers.get('allow')).toBe('GET');
    expect(del.status).toBe(405);
    expect(del.headers.get('allow')).toBe('GET');
  });
});

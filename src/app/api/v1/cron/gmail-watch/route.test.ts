import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    CRON_SECRET: 'test-secret',
  },
}));

describe('GET /api/v1/cron/gmail-watch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 for valid cron bearer authorization', async () => {
    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/v1/cron/gmail-watch', {
      method: 'GET',
      headers: {
        authorization: 'Bearer test-secret',
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.data.status).toBe('ok');
  });

  it('returns 401 when no bearer token is provided', async () => {
    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/v1/cron/gmail-watch', {
      method: 'GET',
    });

    const response = await GET(request);
    expect(response.status).toBe(401);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.error.code).toBe('unauthorized');
  });

  it('returns 401 for an invalid bearer token', async () => {
    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/v1/cron/gmail-watch', {
      method: 'GET',
      headers: {
        authorization: 'Bearer wrong-secret',
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(401);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.error.code).toBe('unauthorized');
  });
});


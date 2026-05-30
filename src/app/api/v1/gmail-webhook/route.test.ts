import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/email-triage/pipeline', () => ({
  processEmail: vi.fn().mockResolvedValue({ success: true, messageId: '123' }),
}));

vi.mock('@/lib/email-triage/gmail', () => ({
  getGmailAccessToken: vi.fn().mockResolvedValue('mock-token'),
  getHistoryChanges: vi.fn().mockResolvedValue([{ id: '123', threadId: '456' }]),
}));

describe('POST /api/v1/gmail-webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 for valid Pub/Sub payload', async () => {
    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/v1/gmail-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          data: Buffer.from(JSON.stringify({
            emailAddress: 'test@example.com',
            historyId: '12345',
          })).toString('base64url'),
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.data.status).toBe('accepted');
  });

  it('returns 200 for invalid payload (no message.data)', async () => {
    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/v1/gmail-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.data.status).toBe('ignored');
  });

  it('returns 200 for payload without historyId', async () => {
    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/v1/gmail-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          data: Buffer.from(JSON.stringify({
            emailAddress: 'test@example.com',
          })).toString('base64url'),
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.data.status).toBe('ignored');
  });
});

import { describe, it, expect } from 'vitest';

describe('POST /api/v1/gmail-webhook', () => {
  it('returns 410 Gone (endpoint deactivated)', async () => {
    const { POST } = await import('./route');
    const request = new Request('http://localhost/api/v1/gmail-webhook', {
      method: 'POST',
    });

    const response = await POST(request);
    expect(response.status).toBe(410);

    const data = await response.json();
    expect(data.error.code).toBe('deactivated');
  });
});

describe('GET /api/v1/gmail-webhook', () => {
  it('returns 410 Gone (endpoint deactivated)', async () => {
    const { GET } = await import('./route');
    const request = new Request('http://localhost/api/v1/gmail-webhook');

    const response = await GET(request);
    expect(response.status).toBe(410);

    const data = await response.json();
    expect(data.error.code).toBe('deactivated');
  });
});

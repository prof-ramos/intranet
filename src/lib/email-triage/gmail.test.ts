import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getHeader, getGmailAccessToken, getMessage, type GmailMessage } from './gmail';

describe('getGmailAccessToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws an error if required environment variables are missing', async () => {
    delete process.env.GMAIL_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_SECRET;
    delete process.env.GMAIL_REFRESH_TOKEN;

    await expect(getGmailAccessToken()).rejects.toThrow(
      'Credenciais Gmail não configuradas. Verifique GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET e GMAIL_REFRESH_TOKEN.'
    );
  });
});

describe('getHeader', () => {
  it('extracts header value by name', () => {
    const message: GmailMessage = {
      payload: {
        headers: [
          { name: 'Subject', value: 'Test Subject' },
          { name: 'From', value: 'test@example.com' },
        ],
      },
    };
    expect(getHeader(message, 'Subject')).toBe('Test Subject');
    expect(getHeader(message, 'From')).toBe('test@example.com');
  });

  it('returns null for missing header', () => {
    const message: GmailMessage = {
      payload: {
        headers: [
          { name: 'Subject', value: 'Test' },
        ],
      },
    };
    expect(getHeader(message, 'Missing')).toBeNull();
  });

  it('handles null message', () => {
    expect(getHeader(null, 'Subject')).toBeNull();
  });

  it('handles message without payload', () => {
    expect(getHeader({}, 'Subject')).toBeNull();
  });

  it('handles case-insensitive header lookup', () => {
    const message: GmailMessage = {
      payload: {
        headers: [
          { name: 'SUBJECT', value: 'Test' },
        ],
      },
    };
    expect(getHeader(message, 'subject')).toBe('Test');
  });
});

describe('getMessage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects a full Gmail response that exceeds the byte budget before parsing it', async () => {
    const oversizedMessage = JSON.stringify({
      id: 'message-1',
      payload: {},
      padding: 'x'.repeat(2 * 1024 * 1024),
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(oversizedMessage, {
        status: 200,
        headers: { 'content-length': String(Buffer.byteLength(oversizedMessage)) },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getMessage('access-token', 'message-1')).rejects.toThrow(
      'Gmail message response exceeds the allowed size.',
    );
  });

  it('enforces the byte budget when Gmail omits Content-Length', async () => {
    const responseBody = `{"id":"message-1","payload":{}}${' '.repeat(2 * 1024 * 1024)}`;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(responseBody, { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getMessage('access-token', 'message-1')).rejects.toThrow(
      'Gmail message response exceeds the allowed size.',
    );
  });
});

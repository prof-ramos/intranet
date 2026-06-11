import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getHeader, getGmailAccessToken, type GmailMessage } from './gmail';

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


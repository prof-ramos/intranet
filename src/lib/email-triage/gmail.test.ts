import { describe, it, expect } from 'vitest';
import { getHeader, type GmailMessage } from './gmail';

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


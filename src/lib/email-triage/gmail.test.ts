import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHeader } from './gmail';

describe('getHeader', () => {
  it('extracts header value by name', () => {
    const message = {
      payload: {
        headers: [
          { name: 'Subject', value: 'Test Subject' },
          { name: 'From', value: 'test@example.com' },
        ],
      },
    };
    expect(getHeader(message as any, 'Subject')).toBe('Test Subject');
    expect(getHeader(message as any, 'From')).toBe('test@example.com');
  });

  it('returns null for missing header', () => {
    const message = {
      payload: {
        headers: [
          { name: 'Subject', value: 'Test' },
        ],
      },
    };
    expect(getHeader(message as any, 'Missing')).toBeNull();
  });

  it('handles null message', () => {
    expect(getHeader(null, 'Subject')).toBeNull();
  });

  it('handles message without payload', () => {
    expect(getHeader({} as any, 'Subject')).toBeNull();
  });

  it('handles case-insensitive header lookup', () => {
    const message = {
      payload: {
        headers: [
          { name: 'SUBJECT', value: 'Test' },
        ],
      },
    };
    expect(getHeader(message as any, 'subject')).toBe('Test');
  });
});

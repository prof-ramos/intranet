import { describe, it, expect } from 'vitest';
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
    expect(getHeader(message as unknown as Parameters<typeof getHeader>[0], 'Subject')).toBe('Test Subject');
    expect(getHeader(message as unknown as Parameters<typeof getHeader>[0], 'From')).toBe('test@example.com');
  });

  it('returns null for missing header', () => {
    const message = {
      payload: {
        headers: [
          { name: 'Subject', value: 'Test' },
        ],
      },
    };
    expect(getHeader(message as unknown as Parameters<typeof getHeader>[0], 'Missing')).toBeNull();
  });

  it('handles null message', () => {
    expect(getHeader(null, 'Subject')).toBeNull();
  });

  it('handles message without payload', () => {
    expect(getHeader({} as unknown as Parameters<typeof getHeader>[0], 'Subject')).toBeNull();
  });

  it('handles case-insensitive header lookup', () => {
    const message = {
      payload: {
        headers: [
          { name: 'SUBJECT', value: 'Test' },
        ],
      },
    };
    expect(getHeader(message as unknown as Parameters<typeof getHeader>[0], 'subject')).toBe('Test');
  });
});

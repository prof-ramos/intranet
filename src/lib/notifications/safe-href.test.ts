import { describe, expect, it } from 'vitest';
import { getSafeInternalHref } from './safe-href';

describe('getSafeInternalHref', () => {
  it('accepts same-origin app paths', () => {
    expect(getSafeInternalHref('/app/atividades?open=12')).toBe('/app/atividades?open=12');
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(getSafeInternalHref('https://example.com')).toBeNull();
    expect(getSafeInternalHref('//evil.example')).toBeNull();
    expect(getSafeInternalHref('/\\evil.example')).toBeNull();
    expect(getSafeInternalHref('/\\\\evil.example')).toBeNull();
  });

  it('rejects empty and non-paths', () => {
    expect(getSafeInternalHref(null)).toBeNull();
    expect(getSafeInternalHref('')).toBeNull();
    expect(getSafeInternalHref('app/atividades')).toBeNull();
  });
});

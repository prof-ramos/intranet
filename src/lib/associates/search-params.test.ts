import { describe, expect, it } from 'vitest';
import {
  buildAssociateNameSearchPattern,
  parseAssociatesSearchParams,
} from './search-params';

describe('associates search params', () => {
  it('normalizes invalid page values to page 1', () => {
    expect(parseAssociatesSearchParams({ page: 'abc' })).toEqual({ q: '', page: 1 });
    expect(parseAssociatesSearchParams({ page: '-3' })).toEqual({ q: '', page: 1 });
    expect(parseAssociatesSearchParams({ page: '2.5' })).toEqual({ q: '', page: 1 });
  });

  it('trims and limits search text', () => {
    const longQuery = `  ${'a'.repeat(90)}  `;

    expect(parseAssociatesSearchParams({ q: longQuery, page: '3' })).toEqual({
      q: 'a'.repeat(80),
      page: 3,
    });
  });

  it('escapes wildcard characters for LIKE searches', () => {
    expect(buildAssociateNameSearchPattern('Ana_%\\Silva')).toBe('%Ana\\_\\%\\\\Silva%');
  });
});

import { describe, expect, it } from 'vitest';
import { buildBoardUrl, hasOpenActivity, parseOpenActivityId } from './url-state';

describe('activity board url state', () => {
  it('parses a valid open activity id from search params', () => {
    expect(parseOpenActivityId(new URLSearchParams('open=12'))).toBe(12);
  });

  it('returns null for missing or invalid open ids', () => {
    expect(parseOpenActivityId(new URLSearchParams(''))).toBeNull();
    expect(parseOpenActivityId(new URLSearchParams('open=0'))).toBeNull();
    expect(parseOpenActivityId(new URLSearchParams('open=abc'))).toBeNull();
    expect(parseOpenActivityId(new URLSearchParams('open=1e2'))).toBeNull();
    expect(parseOpenActivityId(new URLSearchParams('open=0x10'))).toBeNull();
  });

  it('adds or replaces the open param while preserving other filters', () => {
    expect(buildBoardUrl('/app/atividades', new URLSearchParams('scope=minhas&dueLate=true'), 44)).toBe(
      '/app/atividades?scope=minhas&dueLate=true&open=44',
    );
    expect(buildBoardUrl('/app/atividades', new URLSearchParams('open=8&scope=todas'), 44)).toBe(
      '/app/atividades?open=44&scope=todas',
    );
  });

  it('removes the open param when closing the drawer', () => {
    expect(buildBoardUrl('/app/atividades', new URLSearchParams('open=8&scope=todas'), null)).toBe(
      '/app/atividades?scope=todas',
    );
    expect(buildBoardUrl('/app/atividades', new URLSearchParams('open=8'), null)).toBe(
      '/app/atividades',
    );
  });

  it('detects when the open activity is missing from the loaded items', () => {
    expect(hasOpenActivity(8, [{ id: 8 }, { id: 9 }])).toBe(true);
    expect(hasOpenActivity(8, [{ id: 9 }])).toBe(false);
    expect(hasOpenActivity(null, [{ id: 9 }])).toBe(true);
  });
});

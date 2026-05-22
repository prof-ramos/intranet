import { describe, expect, it } from 'vitest';
import { defaultFilters } from './constants';
import {
  buildBoardUrl,
  hasOpenActivity,
  parseFiltersFromUrl,
  parseOpenActivityId,
  serializeFiltersToUrl,
} from './url-state';

describe('activity board url state', () => {
  describe('parseOpenActivityId', () => {
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
  });

  describe('buildBoardUrl', () => {
    it('adds or replaces the open param while preserving other filters', () => {
      expect(
        buildBoardUrl('/app/atividades', new URLSearchParams('scope=minhas&dueLate=true'), 44),
      ).toBe('/app/atividades?scope=minhas&dueLate=true&open=44');
      expect(buildBoardUrl('/app/atividades', new URLSearchParams('open=8&scope=todas'), 44)).toBe(
        '/app/atividades?open=44&scope=todas',
      );
    });

    it('removes the open param when closing the drawer', () => {
      expect(
        buildBoardUrl('/app/atividades', new URLSearchParams('open=8&scope=todas'), null),
      ).toBe('/app/atividades?scope=todas');
      expect(buildBoardUrl('/app/atividades', new URLSearchParams('open=8'), null)).toBe(
        '/app/atividades',
      );
    });

    it('builds url with filters when provided', () => {
      const filters = { ...defaultFilters, scope: 'minhas' as const, dueLate: true };
      const url = buildBoardUrl('/app/atividades', new URLSearchParams(), null, filters);
      expect(url).toContain('scope=minhas');
      expect(url).toContain('dueLate=1');
    });

    it('builds url with filters and open param together', () => {
      const filters = { ...defaultFilters, priority: 'alta' as const };
      const url = buildBoardUrl('/app/atividades', new URLSearchParams(), 7, filters);
      expect(url).toContain('priority=alta');
      expect(url).toContain('open=7');
    });

    it('omits default filter values from url', () => {
      const url = buildBoardUrl('/app/atividades', new URLSearchParams(), null, defaultFilters);
      expect(url).toBe('/app/atividades');
    });
  });

  describe('hasOpenActivity', () => {
    it('detects when the open activity is missing from the loaded items', () => {
      expect(hasOpenActivity(8, [{ id: 8 }, { id: 9 }])).toBe(true);
      expect(hasOpenActivity(8, [{ id: 9 }])).toBe(false);
      expect(hasOpenActivity(null, [{ id: 9 }])).toBe(true);
    });
  });

  describe('parseFiltersFromUrl', () => {
    it('returns defaults for empty params', () => {
      const result = parseFiltersFromUrl(new URLSearchParams());
      expect(result).toEqual(defaultFilters);
    });

    it('parses valid scope filter', () => {
      const result = parseFiltersFromUrl(new URLSearchParams('scope=minhas'));
      expect(result.scope).toBe('minhas');
      expect(result.query).toBe('');
    });

    it('falls back to default for invalid scope', () => {
      const result = parseFiltersFromUrl(new URLSearchParams('scope=invalid'));
      expect(result.scope).toBe('todas');
    });

    it('parses valid priority filter', () => {
      const result = parseFiltersFromUrl(new URLSearchParams('priority=urgente'));
      expect(result.priority).toBe('urgente');
    });

    it('falls back to default for invalid priority', () => {
      const result = parseFiltersFromUrl(new URLSearchParams('priority=invalid'));
      expect(result.priority).toBe('');
    });

    it('parses boolean filters as 1/0', () => {
      const result = parseFiltersFromUrl(new URLSearchParams('dueWeek=1&dueLate=1'));
      expect(result.dueWeek).toBe(true);
      expect(result.dueLate).toBe(true);
    });

    it('defaults boolean filters to false when absent', () => {
      const result = parseFiltersFromUrl(new URLSearchParams());
      expect(result.dueWeek).toBe(false);
      expect(result.dueLate).toBe(false);
    });

    it('parses string filters like assignee and associate', () => {
      const result = parseFiltersFromUrl(new URLSearchParams('assignee=5&associate=10'));
      expect(result.assignee).toBe('5');
      expect(result.associate).toBe('10');
    });

    it('always resets query to default (transient)', () => {
      const result = parseFiltersFromUrl(new URLSearchParams('query=test'));
      expect(result.query).toBe('');
    });
  });

  describe('serializeFiltersToUrl', () => {
    it('serializes non-default scope', () => {
      const params = serializeFiltersToUrl({ ...defaultFilters, scope: 'minhas' });
      expect(params.get('scope')).toBe('minhas');
    });

    it('omits default values', () => {
      const params = serializeFiltersToUrl(defaultFilters);
      expect(params.toString()).toBe('');
    });

    it('serializes boolean filters as 1', () => {
      const params = serializeFiltersToUrl({ ...defaultFilters, dueWeek: true, dueLate: true });
      expect(params.get('dueWeek')).toBe('1');
      expect(params.get('dueLate')).toBe('1');
    });

    it('serializes priority and assignee', () => {
      const params = serializeFiltersToUrl({ ...defaultFilters, priority: 'alta', assignee: '3' });
      expect(params.get('priority')).toBe('alta');
      expect(params.get('assignee')).toBe('3');
    });

    it('roundtrips through parse and serialize', () => {
      const original = {
        ...defaultFilters,
        scope: 'minhas' as const,
        dueLate: true,
        priority: 'alta' as const,
      };
      const serialized = serializeFiltersToUrl(original);
      const parsed = parseFiltersFromUrl(serialized);
      // query is always reset, so compare everything except query
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- query is destructured out for comparison
      const { query: _originalQuery, ...originalWithoutQuery } = original;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- query is destructured out for comparison
      const { query: _parsedQuery, ...parsedWithoutQuery } = parsed;
      expect(parsedWithoutQuery).toEqual(originalWithoutQuery);
    });
  });
});

import { describe, expect, it } from 'vitest';
import { AREAS, TAG_SUGGESTIONS } from '@/lib/activities/constants';

describe('activities/constants', () => {
  describe('AREAS', () => {
    it('has the three expected areas', () => {
      const keys = AREAS.map((a) => a.key);
      expect(keys).toContain('administrativo');
      expect(keys).toContain('juridico');
      expect(keys).toContain('financeiro');
    });

    it('each area has key, label, accent, and desc', () => {
      for (const area of AREAS) {
        expect(area.key).toBeTruthy();
        expect(area.label).toBeTruthy();
        expect(area.accent).toBeTruthy();
        expect(area.desc).toBeTruthy();
      }
    });
  });

  describe('TAG_SUGGESTIONS', () => {
    it('contains expected tags', () => {
      expect(TAG_SUGGESTIONS).toContain('secretaria');
      expect(TAG_SUGGESTIONS).toContain('juridico');
      expect(TAG_SUGGESTIONS).toContain('financeiro');
    });

    it('has no duplicates', () => {
      const unique = new Set(TAG_SUGGESTIONS);
      expect(unique.size).toBe(TAG_SUGGESTIONS.length);
    });
  });
});
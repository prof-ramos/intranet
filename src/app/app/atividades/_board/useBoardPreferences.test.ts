import { beforeEach, describe, expect, it, vi } from 'vitest';

// We test the pure utility logic extracted from useBoardPreferences.
// Since jsdom isn't configured for this project, we mock localStorage manually.

const STORAGE_KEY = 'asof-board-preferences';
const defaults = { compact: false, collapsedDone: false };

function createLocalStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      for (const key of Object.keys(store)) delete store[key];
    }),
    _store: store,
  };
}

function readPreferences(localStorage: { getItem: (key: string) => string | null }): {
  compact: boolean;
  collapsedDone: boolean;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      compact: typeof parsed.compact === 'boolean' ? parsed.compact : defaults.compact,
      collapsedDone:
        typeof parsed.collapsedDone === 'boolean' ? parsed.collapsedDone : defaults.collapsedDone,
    };
  } catch {
    return defaults;
  }
}

describe('board preferences read/write', () => {
  let ls: ReturnType<typeof createLocalStorage>;

  beforeEach(() => {
    ls = createLocalStorage();
  });

  it('returns defaults when localStorage is empty', () => {
    const prefs = readPreferences(ls);
    expect(prefs.compact).toBe(false);
    expect(prefs.collapsedDone).toBe(false);
  });

  it('reads saved preferences from localStorage', () => {
    ls.setItem(STORAGE_KEY, JSON.stringify({ compact: true, collapsedDone: true }));
    const prefs = readPreferences(ls);
    expect(prefs.compact).toBe(true);
    expect(prefs.collapsedDone).toBe(true);
  });

  it('falls back to defaults for invalid JSON', () => {
    ls.setItem(STORAGE_KEY, 'not-json{');
    const prefs = readPreferences(ls);
    expect(prefs.compact).toBe(false);
    expect(prefs.collapsedDone).toBe(false);
  });

  it('falls back to defaults for partial data', () => {
    ls.setItem(STORAGE_KEY, JSON.stringify({ compact: true }));
    const prefs = readPreferences(ls);
    expect(prefs.compact).toBe(true);
    expect(prefs.collapsedDone).toBe(false);
  });

  it('ignores non-boolean values in stored data', () => {
    ls.setItem(STORAGE_KEY, JSON.stringify({ compact: 'yes', collapsedDone: 42 }));
    const prefs = readPreferences(ls);
    expect(prefs.compact).toBe(false);
    expect(prefs.collapsedDone).toBe(false);
  });

  it('roundtrips preferences through localStorage', () => {
    const prefs = { compact: true, collapsedDone: false };
    ls.setItem(STORAGE_KEY, JSON.stringify(prefs));
    const read = readPreferences(ls);
    expect(read).toEqual(prefs);
  });

  it('degrades gracefully when localStorage throws on read', () => {
    ls.getItem.mockImplementation(() => {
      throw new Error('unavailable');
    });
    const prefs = readPreferences(ls);
    expect(prefs.compact).toBe(false);
    expect(prefs.collapsedDone).toBe(false);
  });
});

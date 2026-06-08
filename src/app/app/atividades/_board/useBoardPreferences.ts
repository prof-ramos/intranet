'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'asof-board-preferences';

interface BoardPreferences {
  compact: boolean;
  collapsedDone: boolean;
}

const defaults: BoardPreferences = { compact: false, collapsedDone: false };

function readPreferences(): BoardPreferences {
  if (typeof window === 'undefined') return defaults;
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

function writePreferences(prefs: BoardPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable or quota exceeded — silently degrade
  }
}

export function useBoardPreferences() {
  const [preferences, setPreferencesState] = useState<BoardPreferences>(defaults);

  // SSR-safe localStorage initialization: render defaults on server,
  // then hydrate from localStorage on client to avoid mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional SSR-safe localStorage read
    setPreferencesState(readPreferences());
  }, []);

  const setCompact = useCallback((compact: boolean | ((prev: boolean) => boolean)) => {
    setPreferencesState((prev) => {
      const next = typeof compact === 'function' ? compact(prev.compact) : compact;
      const updated = { ...prev, compact: next };
      writePreferences(updated);
      return updated;
    });
  }, []);

  const setCollapsedDone = useCallback((collapsedDone: boolean | ((prev: boolean) => boolean)) => {
    setPreferencesState((prev) => {
      const next =
        typeof collapsedDone === 'function' ? collapsedDone(prev.collapsedDone) : collapsedDone;
      const updated = { ...prev, collapsedDone: next };
      writePreferences(updated);
      return updated;
    });
  }, []);

  return {
    compact: preferences.compact,
    collapsedDone: preferences.collapsedDone,
    setCompact,
    setCollapsedDone,
  };
}

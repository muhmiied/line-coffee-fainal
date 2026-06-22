"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

// ─── Module-level cache & listeners ──────────────────────────────────────────
// Shared across all hook instances for the same key.

const _cache = new Map<string, { raw: string; parsed: unknown }>();
const _listeners = new Map<string, Set<() => void>>();

function _listenerSet(key: string): Set<() => void> {
  if (!_listeners.has(key)) _listeners.set(key, new Set());
  return _listeners.get(key)!;
}

function _getStable<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const cached = _cache.get(key);
    // Return cached reference if raw string hasn't changed (reference stability for arrays/objects)
    if (cached?.raw === raw) return cached.parsed as T;
    const parsed = JSON.parse(raw) as T;
    _cache.set(key, { raw, parsed });
    return parsed;
  } catch {
    return fallback;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLocalStorage<T>(key: string, initial: T) {
  // Capture `initial` once in a ref so callbacks don't depend on it as a reactive value.
  // This prevents subscribe/getSnapshot from being recreated when caller passes a literal [] or {}.
  const initialRef = useRef(initial);

  const subscribe = useCallback(
    (cb: () => void) => {
      const set = _listenerSet(key);
      set.add(cb);
      // Also sync when the user changes storage in another tab
      const onStorage = (e: StorageEvent) => {
        if (e.key === null || e.key === key) {
          _cache.delete(key);
          cb();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        set.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key],
  );

  // Client snapshot: reads current localStorage value (stable reference via _cache)
  const getSnapshot = useCallback(() => _getStable(key, initialRef.current), [key]);

  // Server snapshot: always returns initial — prevents hydration mismatch
  const getServerSnapshot = useCallback(() => initialRef.current, []);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = _getStable(key, initialRef.current);
      const resolved =
        typeof next === "function" ? (next as (p: T) => T)(current) : next;
      try {
        const raw = JSON.stringify(resolved);
        window.localStorage.setItem(key, raw);
        _cache.set(key, { raw, parsed: resolved });
        // Notify all same-tab subscribers
        _listenerSet(key).forEach((cb) => cb());
      } catch {
        // quota exceeded or private mode
      }
    },
    [key],
  );

  return [value, setValue] as const;
}

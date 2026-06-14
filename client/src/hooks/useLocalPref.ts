import { useEffect, useState } from 'react';

// A piece of UI state persisted to localStorage (per-device, not synced).
export function useLocalPref<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage blocked — keep in memory only */
    }
  }, [key, value]);
  return [value, setValue];
}

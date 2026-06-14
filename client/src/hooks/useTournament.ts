import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchState, saveState, type TournamentState } from '../api';
import { blankDataset, type Dataset } from '../lib/standings';
import { cleanupDownstream } from '../lib/bracket';

export type SyncStatus = 'loading' | 'ok' | 'saving' | 'offline';
export type Which = 'actual' | 'predict';

const CACHE_KEY = 'wc26_datasets_v1';
const SAVE_DEBOUNCE = 600;

function emptyState(): TournamentState {
  return { actual: blankDataset(), predict: blankDataset() };
}

function readCache(): TournamentState | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return {
      actual: Object.assign(blankDataset(), s.actual),
      predict: Object.assign(blankDataset(), s.predict),
    };
  } catch {
    return null;
  }
}
function writeCache(s: TournamentState) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(s));
  } catch {
    /* storage blocked */
  }
}

export interface Tournament {
  state: TournamentState;
  status: SyncStatus;
  mutate: (fn: (s: TournamentState) => void) => void;
  replaceDataset: (which: Which, ds: Dataset) => void;
}

export function useTournament(): Tournament {
  const [state, setState] = useState<TournamentState>(() => readCache() ?? emptyState());
  const [status, setStatus] = useState<SyncStatus>('loading');
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(state);
  latest.current = state;

  // Push current state to the server (debounced via scheduleSave).
  const doSave = useCallback(async () => {
    setStatus('saving');
    try {
      await saveState(latest.current);
      dirtyRef.current = false;
      setStatus('ok');
    } catch {
      setStatus('offline');
    }
  }, []);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, SAVE_DEBOUNCE);
  }, [doSave]);

  // Initial load: adopt server state if present, otherwise seed it from cache.
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const server = await fetchState(ctrl.signal);
        if (server) {
          const merged: TournamentState = {
            actual: Object.assign(blankDataset(), server.actual),
            predict: Object.assign(blankDataset(), server.predict),
          };
          setState(merged);
          writeCache(merged);
          setStatus('ok');
        } else if (readCache()) {
          // Server empty but we have local data: seed the server with it.
          await saveState(latest.current);
          setStatus('ok');
        } else {
          setStatus('ok');
        }
      } catch {
        setStatus('offline');
      }
    })();
    return () => ctrl.abort();
  }, []);

  // Pull fresh state when returning to the tab (picks up edits from other devices),
  // but never clobber unsaved local edits.
  useEffect(() => {
    const onFocus = async () => {
      if (dirtyRef.current || document.visibilityState !== 'visible') return;
      try {
        const server = await fetchState();
        if (server) {
          const merged: TournamentState = {
            actual: Object.assign(blankDataset(), server.actual),
            predict: Object.assign(blankDataset(), server.predict),
          };
          setState(merged);
          writeCache(merged);
          setStatus('ok');
        }
      } catch {
        setStatus('offline');
      }
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Apply a mutation: clone, mutate, normalize knockout, persist locally + remotely.
  const mutate = useCallback((fn: (s: TournamentState) => void) => {
    setState((prev) => {
      const next: TournamentState = structuredClone(prev);
      fn(next);
      cleanupDownstream(next.actual);
      cleanupDownstream(next.predict);
      writeCache(next);
      return next;
    });
    scheduleSave();
  }, [scheduleSave]);

  const replaceDataset = useCallback((which: Which, ds: Dataset) => {
    mutate((s) => { s[which] = ds; });
  }, [mutate]);

  return { state, status, mutate, replaceDataset };
}

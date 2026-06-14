import type { Dataset } from './lib/standings';

export interface TournamentState {
  actual: Dataset;
  predict: Dataset;
}

// Fetch the shared tournament state from the server.
// Returns null if the server has no saved state yet.
export async function fetchState(signal?: AbortSignal): Promise<TournamentState | null> {
  const res = await fetch('/api/state', { signal });
  if (!res.ok) throw new Error('fetch failed: ' + res.status);
  const body = await res.json();
  return body && body.datasets ? (body.datasets as TournamentState) : null;
}

// Persist the shared tournament state. Returns the server timestamp.
export async function saveState(datasets: TournamentState, signal?: AbortSignal): Promise<number> {
  const res = await fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ datasets }),
    signal,
  });
  if (!res.ok) throw new Error('save failed: ' + res.status);
  const body = await res.json();
  return body.updatedAt as number;
}

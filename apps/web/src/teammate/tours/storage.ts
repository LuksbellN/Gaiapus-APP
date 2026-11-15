// Tutorial progress (Docs/ux-preservacao/04, section 2). Kept apart from the account buckets: it is interface
// reading progress, not farm data. Never touches gaiapus.v1* or drafts.
import { useSyncExternalStore } from 'react';

export const TOURS_KEY = 'gaiapus.tours';
export type TourState = 'new' | 'dismissed' | 'in_progress' | 'done';
export type TourRecord = { state: TourState; step?: number; at: string };
type Stored = { v: 1; tours: Record<string, TourRecord> };

const subs = new Set<() => void>();
let cache: Stored | null = null;

function read(): Stored {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(TOURS_KEY) ?? 'null') as Stored | null;
    cache = raw && raw.v === 1 && raw.tours && typeof raw.tours === 'object' ? raw : { v: 1, tours: {} };
  } catch { cache = { v: 1, tours: {} }; }
  return cache;
}

export function tourRecord(id: string): TourRecord { return read().tours[id] ?? { state: 'new', at: '' }; }

export function setTour(id: string, state: TourState, step?: number) {
  const next: Stored = { v: 1, tours: { ...read().tours, [id]: { state, ...(step === undefined ? {} : { step }), at: new Date().toISOString() } } };
  cache = next;
  try { localStorage.setItem(TOURS_KEY, JSON.stringify(next)); } catch { /* no storage: progress lives for this page only */ }
  subs.forEach((f) => f());
}

/** Used by "delete all data on this device". */
export function clearTours() {
  cache = { v: 1, tours: {} };
  try { localStorage.removeItem(TOURS_KEY); } catch { /* no storage */ }
  subs.forEach((f) => f());
}

export function useTourRecords() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => read().tours);
}

export function reloadToursForTest() { cache = null; }

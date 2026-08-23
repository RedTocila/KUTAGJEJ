'use client';

import * as React from 'react';

import { useUser } from '@/hooks/use-user';
import {
  fetchSavedListingKeys,
  listingMetricsKey,
  nextSaveCount,
  toggleListingSave,
  type ListingMetricKind,
} from '@/lib/listing-metrics';
import { emitHotLeadSave } from '@/lib/listing-hot-lead';

function canUseBookmarks(user: ReturnType<typeof useUser>['user']) {
  return (
    user?.accountType === 'individual' ||
    user?.accountType === 'business' ||
    user?.role === 'business-user'
  );
}

const CACHE_PREFIX = 'kutagjej-saved-keys:';
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedBookmarkState = {
  at: number;
  keys: string[];
  counts?: Record<string, number>;
};

function cacheKey(userId: string) {
  return `${CACHE_PREFIX}${userId}`;
}

function readCachedState(userId: string): { keys: string[]; counts: Record<string, number> } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedBookmarkState;
    if (!parsed || !Array.isArray(parsed.keys) || typeof parsed.at !== 'number') return null;
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    const counts =
      parsed.counts && typeof parsed.counts === 'object' && !Array.isArray(parsed.counts)
        ? parsed.counts
        : {};
    return { keys: parsed.keys, counts };
  } catch {
    return null;
  }
}

function writeCachedState(userId: string, keys: string[], counts: Record<string, number>) {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedBookmarkState = { at: Date.now(), keys, counts };
    sessionStorage.setItem(cacheKey(userId), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export type SavedListingsContextValue = {
  ready: boolean;
  keys: Set<string>;
  isSaved: (kind: ListingMetricKind, listingId: string) => boolean;
  getSaveCount: (kind: ListingMetricKind, listingId: string) => number | undefined;
  refresh: () => Promise<void>;
  /** Apply keys from another API (e.g. saved list payload) without a second round-trip. */
  hydrateKeys: (keys: string[]) => void;
  applySaved: (kind: ListingMetricKind, listingId: string, saved: boolean) => void;
  toggleSaved: (
    kind: ListingMetricKind,
    listingId: string,
    opts?: { fromCount?: number },
  ) => Promise<{ saved: boolean; saveCount: number; stale?: boolean } | null>;
};

export const SavedListingsContext = React.createContext<SavedListingsContextValue | undefined>(undefined);

export function SavedListingsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  const [ready, setReady] = React.useState(false);
  const [keys, setKeys] = React.useState<Set<string>>(() => new Set());
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const keysRef = React.useRef(keys);
  const countsRef = React.useRef(counts);
  const toggleSeqRef = React.useRef(new Map<string, number>());

  keysRef.current = keys;
  countsRef.current = counts;

  const persist = React.useCallback(
    (nextKeys: Set<string>, nextCounts: Record<string, number>) => {
      if (user?.id) writeCachedState(user.id, [...nextKeys], nextCounts);
    },
    [user?.id],
  );

  const hydrateKeys = React.useCallback(
    (nextKeys: string[]) => {
      const keySet = new Set(nextKeys);
      keysRef.current = keySet;
      setKeys(keySet);
      setReady(true);
      persist(keySet, countsRef.current);
    },
    [persist],
  );

  const refresh = React.useCallback(async () => {
    const allowed =
      user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user';
    if (!allowed) {
      setKeys(new Set());
      setCounts({});
      setReady(true);
      return;
    }
    const res = await fetchSavedListingKeys();
    const next = res.keys ?? [];
    const keySet = new Set(next);
    keysRef.current = keySet;
    setKeys(keySet);
    setReady(true);
    persist(keySet, countsRef.current);
  }, [persist, user?.id, user?.accountType, user?.role]);

  React.useEffect(() => {
    if (isLoading) return;
    if (!canUseBookmarks(user) || !user?.id) {
      setKeys(new Set());
      setCounts({});
      setReady(true);
      return;
    }

    const userId = user.id;
    const cached = readCachedState(userId);
    if (cached) {
      const keySet = new Set(cached.keys);
      keysRef.current = keySet;
      countsRef.current = cached.counts;
      setKeys(keySet);
      setCounts(cached.counts);
      setReady(true);
      // Revalidate keys in background without blanking bookmark or count state.
      void refresh();
      return;
    }

    setReady(false);
    void refresh();
  }, [isLoading, refresh, user?.id, user?.accountType, user?.role]);

  const isSaved = React.useCallback(
    (kind: ListingMetricKind, listingId: string) => keys.has(listingMetricsKey(kind, listingId)),
    [keys],
  );

  const getSaveCount = React.useCallback(
    (kind: ListingMetricKind, listingId: string) => counts[listingMetricsKey(kind, listingId)],
    [counts],
  );

  const rememberCount = React.useCallback(
    (key: string, saveCount: number) => {
      const next = { ...countsRef.current, [key]: saveCount };
      countsRef.current = next;
      setCounts(next);
      persist(keysRef.current, next);
    },
    [persist],
  );

  const applySaved = React.useCallback(
    (kind: ListingMetricKind, listingId: string, saved: boolean) => {
      const key = listingMetricsKey(kind, listingId);
      const next = new Set(keysRef.current);
      if (saved) next.add(key);
      else next.delete(key);
      keysRef.current = next;
      setKeys(next);
      persist(next, countsRef.current);
    },
    [persist],
  );

  const toggleSaved = React.useCallback(
    async (kind: ListingMetricKind, listingId: string, opts?: { fromCount?: number }) => {
      const key = listingMetricsKey(kind, listingId);
      const wasSaved = keysRef.current.has(key);
      const nextSaved = !wasSaved;
      const seq = (toggleSeqRef.current.get(key) ?? 0) + 1;
      toggleSeqRef.current.set(key, seq);

      const fromCount =
        typeof opts?.fromCount === 'number'
          ? opts.fromCount
          : (countsRef.current[key] ?? 0);
      const optimistic = Math.max(0, fromCount + (wasSaved ? -1 : 1));
      const optimisticCount = nextSaved ? Math.max(optimistic, 1) : optimistic;

      applySaved(kind, listingId, nextSaved);
      rememberCount(key, optimisticCount);

      const metrics = await toggleListingSave(kind, listingId);
      if (toggleSeqRef.current.get(key) !== seq) {
        return { saved: nextSaved, saveCount: optimisticCount, stale: true };
      }
      if (!metrics) {
        applySaved(kind, listingId, wasSaved);
        rememberCount(key, fromCount);
        return null;
      }
      applySaved(kind, listingId, metrics.saved);
      const saveCount = nextSaveCount(optimisticCount, metrics);
      rememberCount(key, saveCount);
      if (metrics.saved && !wasSaved) {
        emitHotLeadSave(kind, listingId);
      }
      return { saved: metrics.saved, saveCount };
    },
    [applySaved, rememberCount],
  );

  const value = React.useMemo(
    () => ({
      ready,
      keys,
      isSaved,
      getSaveCount,
      refresh,
      hydrateKeys,
      applySaved,
      toggleSaved,
    }),
    [applySaved, getSaveCount, hydrateKeys, isSaved, keys, ready, refresh, toggleSaved],
  );

  return <SavedListingsContext.Provider value={value}>{children}</SavedListingsContext.Provider>;
}

export function useSavedListings(): SavedListingsContextValue {
  const ctx = React.useContext(SavedListingsContext);
  if (!ctx) {
    throw new Error('useSavedListings must be used within SavedListingsProvider');
  }
  return ctx;
}

/** Safe when provider is optional (returns nullish helpers). */
export function useSavedListingsOptional(): SavedListingsContextValue | null {
  return React.useContext(SavedListingsContext) ?? null;
}

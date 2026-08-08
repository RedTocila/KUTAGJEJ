'use client';

import * as React from 'react';

import { useUser } from '@/hooks/use-user';
import {
  fetchSavedListingKeys,
  listingMetricsKey,
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

export type SavedListingsContextValue = {
  ready: boolean;
  keys: Set<string>;
  isSaved: (kind: ListingMetricKind, listingId: string) => boolean;
  refresh: () => Promise<void>;
  applySaved: (kind: ListingMetricKind, listingId: string, saved: boolean) => void;
  toggleSaved: (
    kind: ListingMetricKind,
    listingId: string,
  ) => Promise<{ saved: boolean; saveCount: number; stale?: boolean } | null>;
};

export const SavedListingsContext = React.createContext<SavedListingsContextValue | undefined>(undefined);

export function SavedListingsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  const [ready, setReady] = React.useState(false);
  const [keys, setKeys] = React.useState<Set<string>>(() => new Set());
  const keysRef = React.useRef(keys);
  const toggleSeqRef = React.useRef(new Map<string, number>());

  keysRef.current = keys;

  const refresh = React.useCallback(async () => {
    if (!canUseBookmarks(user)) {
      setKeys(new Set());
      setReady(true);
      return;
    }
    const res = await fetchSavedListingKeys();
    setKeys(new Set(res.keys ?? []));
    setReady(true);
  }, [user]);

  React.useEffect(() => {
    if (isLoading) return;
    setReady(false);
    void refresh();
  }, [isLoading, refresh, user?.id]);

  const isSaved = React.useCallback(
    (kind: ListingMetricKind, listingId: string) => keys.has(listingMetricsKey(kind, listingId)),
    [keys],
  );

  const applySaved = React.useCallback((kind: ListingMetricKind, listingId: string, saved: boolean) => {
    const key = listingMetricsKey(kind, listingId);
    setKeys((prev) => {
      const next = new Set(prev);
      if (saved) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const toggleSaved = React.useCallback(
    async (kind: ListingMetricKind, listingId: string) => {
      const key = listingMetricsKey(kind, listingId);
      const wasSaved = keysRef.current.has(key);
      const nextSaved = !wasSaved;
      const seq = (toggleSeqRef.current.get(key) ?? 0) + 1;
      toggleSeqRef.current.set(key, seq);

      // Flip UI immediately; reconcile with the server when the request finishes.
      applySaved(kind, listingId, nextSaved);

      const metrics = await toggleListingSave(kind, listingId);
      if (toggleSeqRef.current.get(key) !== seq) {
        // A newer toggle for this listing owns the UI; keep optimistic state as-is.
        return { saved: nextSaved, saveCount: 0, stale: true };
      }
      if (!metrics) {
        applySaved(kind, listingId, wasSaved);
        return null;
      }
      applySaved(kind, listingId, metrics.saved);
      if (metrics.saved && !wasSaved) {
        emitHotLeadSave(kind, listingId);
      }
      return { saved: metrics.saved, saveCount: metrics.saveCount };
    },
    [applySaved],
  );

  const value = React.useMemo(
    () => ({ ready, keys, isSaved, refresh, applySaved, toggleSaved }),
    [ready, keys, isSaved, refresh, applySaved, toggleSaved],
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

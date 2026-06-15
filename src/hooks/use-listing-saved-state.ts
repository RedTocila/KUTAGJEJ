'use client';

import * as React from 'react';

import { useSavedListingsOptional } from '@/contexts/saved-listings-context';
import { listingMetricsKey, type ListingMetricKind } from '@/lib/listing-metrics';

/**
 * Resolves bookmark state from the global saved-keys cache (hydrated on login).
 * Falls back to SSR `initialSaved` until the cache is ready.
 */
export function useListingSavedState(
  listingKind: ListingMetricKind,
  listingId: string,
  initialSaved?: boolean,
): boolean {
  const savedCtx = useSavedListingsOptional();
  const key = listingMetricsKey(listingKind, listingId);

  if (!savedCtx) return Boolean(initialSaved);

  if (!savedCtx.ready) {
    return savedCtx.keys.has(key) || Boolean(initialSaved);
  }

  return savedCtx.isSaved(listingKind, listingId);
}

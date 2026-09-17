'use client';

import * as React from 'react';

import { useSharedSecondTick } from '@/hooks/use-shared-second-tick';
import {
  applyLiveFeedListings,
  liveFeedFingerprint,
  type LiveFeedOptions,
  type LivePromoListing,
} from '@/lib/listing-promo-live';

/**
 * Keeps public feeds honest while the tab stays open:
 * - job visibility timer ends → listing drops out
 * - premium / okazion ends → demote and re-order (Okazion → Premium → free)
 *
 * Only commits a new array when membership, promo tier, or order actually changes.
 */
export function useLiveFeedListings<T extends LivePromoListing>(
  listings: T[],
  options: LiveFeedOptions = {}
): T[] {
  const nowMs = useSharedSecondTick();
  const effectiveNow = nowMs > 0 ? nowMs : Date.now();
  const optionsKey = `${options.dropExpiredJobs ? 1 : 0}:${options.dropExpiredOkazion ? 1 : 0}`;

  const [live, setLive] = React.useState(() => applyLiveFeedListings(listings, effectiveNow, options));

  React.useEffect(() => {
    const next = applyLiveFeedListings(listings, effectiveNow, options);
    setLive((prev) => {
      const prevFp = liveFeedFingerprint(prev, effectiveNow, options);
      const nextFp = liveFeedFingerprint(next, effectiveNow, options);
      return prevFp === nextFp ? prev : next;
    });
  }, [listings, effectiveNow, optionsKey]); // eslint-disable-line react-hooks/exhaustive-deps -- options keyed

  return live;
}

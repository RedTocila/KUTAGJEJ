'use client';

import * as React from 'react';

import { nextViewCount, type ListingMetrics } from '@/lib/listing-metrics';

/** Live eye count on a detail page: starts from the listing payload, then takes the view POST total. */
export function useListingViewCount(listingId: string, initialCount = 0) {
  const [viewCount, setViewCount] = React.useState(initialCount);

  React.useEffect(() => {
    setViewCount(initialCount);
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps -- same listing: keep the live total over a stale refetch

  React.useEffect(() => {
    setViewCount((count) => Math.max(count, initialCount));
  }, [initialCount]);

  const onViewed = React.useCallback((metrics: ListingMetrics | null) => {
    setViewCount((count) => nextViewCount(count, metrics));
  }, []);

  return { viewCount, onViewed };
}

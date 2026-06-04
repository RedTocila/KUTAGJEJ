'use client';

import * as React from 'react';

import { recordListingMetricEvent, type ListingMetricKind } from '@/lib/listing-metrics';

/** Records a detail-page view once per mount (deduped server-side per visitor). */
export function ListingMetricsTracker({
  listingKind,
  listingId,
}: {
  listingKind: ListingMetricKind;
  listingId: string;
}) {
  React.useEffect(() => {
    void recordListingMetricEvent(listingKind, listingId, 'view');
  }, [listingKind, listingId]);

  return null;
}

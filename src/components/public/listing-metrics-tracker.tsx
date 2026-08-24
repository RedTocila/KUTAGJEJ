'use client';

import * as React from 'react';

import { ListingHotLeadTracker } from '@/components/public/listing-hot-lead-tracker';
import {
  recordListingMetricEvent,
  type ListingMetricKind,
  type ListingMetrics,
} from '@/lib/listing-metrics';
import { recordListingView } from '@/lib/user-interest-history';

/** Records a detail-page view once per mount (deduped server-side per visitor). */
export function ListingMetricsTracker({
  listingKind,
  listingId,
  city,
  category,
  ownerId,
  photoCount,
  onViewed,
}: {
  listingKind: ListingMetricKind;
  listingId: string;
  /** Optional signals used for homepage “recommended” personalization. */
  city?: string | null;
  category?: string | null;
  /** Seller id — enables multi-listing High Interest signals. */
  ownerId?: string | null;
  /** Distinct photos available (cover + gallery/portfolio) for the photos signal. */
  photoCount?: number | null;
  /** Server metrics after the view POST (omitted when the request fails). */
  onViewed?: (metrics: ListingMetrics | null) => void;
}) {
  const onViewedRef = React.useRef(onViewed);
  onViewedRef.current = onViewed;

  React.useEffect(() => {
    recordListingView({ kind: listingKind, listingId, city, category });
    void recordListingMetricEvent(listingKind, listingId, 'view').then((metrics) => {
      onViewedRef.current?.(metrics);
    });
  }, [listingKind, listingId, city, category]);

  return (
    <ListingHotLeadTracker
      listingKind={listingKind}
      listingId={listingId}
      ownerId={ownerId}
      photoCount={photoCount}
    />
  );
}

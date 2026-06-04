'use client';

import * as React from 'react';
import Link from 'next/link';

import { recordListingMetricEvent, type ListingMetricKind } from '@/lib/listing-metrics';

type LinkProps = React.ComponentProps<typeof Link>;

export function ListingCardLink({
  listingKind,
  listingId,
  onClick,
  ...props
}: LinkProps & { listingKind: ListingMetricKind; listingId: string }) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        void recordListingMetricEvent(listingKind, listingId, 'click');
        onClick?.(event);
      }}
    />
  );
}

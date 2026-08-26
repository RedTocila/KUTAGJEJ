'use client';

import * as React from 'react';
import Link from 'next/link';

import type { ListingMetricKind } from '@/lib/listing-metrics';

type LinkProps = React.ComponentProps<typeof Link>;

export function ListingCardLink({
  listingKind: _listingKind,
  listingId: _listingId,
  ...props
}: LinkProps & { listingKind: ListingMetricKind; listingId: string }) {
  return <Link {...props} />;
}

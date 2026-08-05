import * as React from 'react';

import { ListingDetailSkeleton } from '@/components/public/listing-detail-skeleton';
import { PublicShell } from '@/components/public/public-shell';

export default function Loading(): React.JSX.Element {
  return (
    <PublicShell hideHeaderBelowMd>
      <ListingDetailSkeleton />
    </PublicShell>
  );
}

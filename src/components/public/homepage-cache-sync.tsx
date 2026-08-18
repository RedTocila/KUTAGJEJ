'use client';

import * as React from 'react';

import { patchHomepageListingsCache } from '@/lib/homepage-session-cache';
import type { PublicListingsBundle } from '@/lib/public-listings-client';

/** Persist listing rows for instant back-to-home. OKAZION is stored by its own section. */
export function HomepageCacheSync({ bundle }: { bundle: PublicListingsBundle }) {
  React.useEffect(() => {
    patchHomepageListingsCache({
      realEstate: bundle.realEstate,
      cars: bundle.cars,
      jobs: bundle.jobs,
      marketplace: bundle.marketplace,
      businesses: bundle.businesses,
      professionals: bundle.professionals,
      totals: bundle.totals,
    });
  }, [bundle]);
  return null;
}

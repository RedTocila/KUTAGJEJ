'use client';

import * as React from 'react';

import { writeHomepageListingsCache } from '@/lib/homepage-session-cache';
import type { PublicListingsBundle } from '@/lib/public-listings-client';

/** Persist the last successful homepage bundle for instant back-to-home / reopen. */
export function HomepageCacheSync({ bundle }: { bundle: PublicListingsBundle }) {
  React.useEffect(() => {
    writeHomepageListingsCache(bundle);
  }, [bundle]);
  return null;
}

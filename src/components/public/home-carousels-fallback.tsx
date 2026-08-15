'use client';

import * as React from 'react';

import { HomepageCarousels } from '@/components/public/homepage-carousels';
import { HomeCarouselsSkeleton } from '@/components/public/homepage-skeletons';
import {
  getHomepageListingsCacheServerSnapshot,
  getHomepageListingsCacheSnapshot,
  subscribeHomepageListingsCache,
  writeHomepageListingsCache,
} from '@/lib/homepage-session-cache';
import { fetchHomepageListings } from '@/lib/public-listings-client';

/**
 * Paints the last homepage from sessionStorage while RSC/API catch up.
 * `refresh` revalidates in the background (failed SSR / explicit recovery).
 */
export function HomeCarouselsFallback({ refresh = false }: { refresh?: boolean }): React.JSX.Element {
  const stored = React.useSyncExternalStore(
    subscribeHomepageListingsCache,
    getHomepageListingsCacheSnapshot,
    getHomepageListingsCacheServerSnapshot,
  );
  const [refreshed, setRefreshed] = React.useState<typeof stored>(null);
  const bundle = refreshed ?? stored;

  React.useEffect(() => {
    if (!refresh) return;
    let cancelled = false;
    void (async () => {
      const res = await fetchHomepageListings(8);
      if (cancelled || !res.ok) return;
      writeHomepageListingsCache(res);
      setRefreshed(res);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  if (!bundle) return <HomeCarouselsSkeleton />;
  return <HomepageCarousels bundle={bundle} ssrOk />;
}

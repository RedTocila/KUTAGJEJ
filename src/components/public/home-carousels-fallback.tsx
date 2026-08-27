'use client';

import * as React from 'react';

import { HomepageBelowFold, HomepageCarousels } from '@/components/public/homepage-carousels';
import { HomepageOkazionSection } from '@/components/public/homepage-okazion-section';
import { HomepageRecommendedSection } from '@/components/public/homepage-recommended-section';
import { HomeCarouselRowSkeleton, HomeCarouselsSkeleton } from '@/components/public/homepage-skeletons';
import { buildHomepageMixedLatest } from '@/lib/homepage-latest-listings';
import {
  getHomepageListingsCacheServerSnapshot,
  getHomepageListingsCacheSnapshot,
  subscribeHomepageListingsCache,
  writeHomepageListingsCache,
} from '@/lib/homepage-session-cache';
import { fetchHomepageListings } from '@/lib/public-listings-client';

function useHomepageCache() {
  return React.useSyncExternalStore(
    subscribeHomepageListingsCache,
    getHomepageListingsCacheSnapshot,
    getHomepageListingsCacheServerSnapshot,
  );
}

/**
 * Paints the last homepage from sessionStorage while RSC/API catch up.
 * `refresh` revalidates in the background (failed SSR / explicit recovery).
 */
export function HomeCarouselsFallback({ refresh = false }: { refresh?: boolean }): React.JSX.Element {
  const stored = useHomepageCache();
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

/** Instant recommended row from session cache, otherwise a single skeleton. */
export function HomeRecommendedFallback(): React.JSX.Element {
  const stored = useHomepageCache();
  const mixed = stored ? buildHomepageMixedLatest(stored, 8) : [];
  if (mixed.length > 0) {
    return <HomepageRecommendedSection fallbackItems={mixed} />;
  }
  return <HomeCarouselRowSkeleton />;
}

/** Instant OKAZION row from session cache, otherwise a single skeleton. */
export function HomeOkazionFallback(): React.JSX.Element {
  const stored = useHomepageCache();
  if (stored?.okazion.length) {
    return <HomepageOkazionSection listings={stored.okazion} total={stored.okazionTotal} ssrOk />;
  }
  return <HomeCarouselRowSkeleton compactTop />;
}

export function HomeBelowFoldFallback(): React.JSX.Element {
  return <HomepageBelowFold />;
}

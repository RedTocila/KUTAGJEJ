'use client';

import * as React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';

import { getHomepageListingsCacheSnapshot, patchHomepageVertical, sliceHomepageVertical } from '@/lib/homepage-session-cache';
import {
  fetchLatestVertical,
  type HomepageLatestVerticalId,
  type PublicCarListing,
  type PublicDirectoryListing,
  type PublicJobListing,
  type PublicMarketplaceListing,
  type PublicRealEstateListing,
} from '@/lib/public-listings-client';
import { CarCard } from '@/components/public/listing-cards/car-card';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { ListingsSection } from '@/components/public/listings-section';
import { useRegisterTabRefresh } from '@/hooks/use-tab-refresh';

type HomeListing =
  | PublicRealEstateListing
  | PublicCarListing
  | PublicJobListing
  | PublicMarketplaceListing
  | PublicDirectoryListing;

const sectionCache = new Map<string, { listings: HomeListing[]; total: number }>();

function cacheKey(vertical: string, limit: number) {
  return `${vertical}:${limit}`;
}

function CarouselSkeleton() {
  return (
    <Stack direction="row" spacing={2} sx={{ overflow: 'hidden', px: { xs: 2, md: 0 } }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Box key={i} sx={{ minWidth: 260, flex: '0 0 auto' }}>
          <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3 }} />
          <Skeleton width="70%" sx={{ mt: 1.5 }} />
          <Skeleton width="40%" />
        </Box>
      ))}
    </Stack>
  );
}

function renderListingCard(verticalId: HomepageLatestVerticalId, listing: HomeListing) {
  switch (verticalId) {
    case 'real-estate':
      return <RealEstateCard key={listing.id} listing={listing as PublicRealEstateListing} />;
    case 'cars':
      return <CarCard key={listing.id} listing={listing as PublicCarListing} />;
    case 'jobs':
      return <JobCard key={listing.id} listing={listing as PublicJobListing} variant="carousel" />;
    case 'marketplace':
      return <MarketplaceCard key={listing.id} listing={listing as PublicMarketplaceListing} />;
    case 'businesses':
    case 'professionals':
      return <DirectoryListingCard key={listing.id} listing={listing as PublicDirectoryListing} />;
    default:
      return null;
  }
}

/**
 * Homepage vertical carousel that loads when scrolled near the viewport.
 * Keeps an in-memory cache so soft navigations back to `/` don’t refetch.
 * Cards are rendered inside this client module (no function props from the server).
 *
 * When SSR returned an empty list (cold API, timeout, or a false empty), we
 * treat it as unloaded and refetch on the client so the first paint is a
 * skeleton — never a “no listings yet” flash.
 */
export function LazyHomeSection({
  verticalId,
  limit = 8,
  initialListings,
  initialTotal,
  initialOk: _initialOk = true,
  eager = false,
}: {
  verticalId: HomepageLatestVerticalId;
  limit?: number;
  /** When SSR already loaded this vertical, skip the network trip. */
  initialListings?: HomeListing[];
  initialTotal?: number;
  /** False when SSR fetch failed (empty is not trustworthy). */
  initialOk?: boolean;
  /** Skip IntersectionObserver and load immediately (above-the-fold). */
  eager?: boolean;
}) {
  const key = cacheKey(verticalId, limit);
  const cached = sectionCache.get(key);
  const ssrTrusted = Boolean(initialListings && initialListings.length > 0);
  const sessionSlice =
    !ssrTrusted && !cached
      ? (() => {
          const session = getHomepageListingsCacheSnapshot();
          return session ? sliceHomepageVertical(session, verticalId, limit) : null;
        })()
      : null;
  const sessionListings = (sessionSlice?.listings as HomeListing[] | undefined) ?? [];
  const initialCount = (ssrTrusted ? initialTotal : undefined) ?? cached?.total ?? sessionSlice?.total ?? 0;
  const countReady = initialCount > 0;

  const [listings, setListings] = React.useState<HomeListing[]>(
    () => (ssrTrusted ? initialListings! : cached?.listings ?? sessionListings) ?? []
  );
  const [total, setTotal] = React.useState(() => initialCount);
  const [loaded, setLoaded] = React.useState(() => (ssrTrusted || Boolean(cached)) && countReady);
  const [active, setActive] = React.useState(() => eager || ssrTrusted || Boolean(cached));
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (active) return;
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  React.useEffect(() => {
    if (!active || loaded) return;
    let cancelled = false;
    void (async () => {
      const hit = sectionCache.get(key);
      if (hit && !(hit.listings.length > 0 && hit.total === 0)) {
        if (!cancelled) {
          setListings(hit.listings);
          setTotal(hit.total);
          setLoaded(true);
        }
        return;
      }
      const session = getHomepageListingsCacheSnapshot();
      const sessionSlice = session ? sliceHomepageVertical(session, verticalId, limit) : null;
      if (sessionSlice && sessionSlice.listings.length > 0 && !cancelled) {
        setListings(sessionSlice.listings as HomeListing[]);
        setTotal(sessionSlice.total);
      }
      const res = await fetchLatestVertical<HomeListing>(verticalId, limit);
      if (cancelled) return;
      // Only cache successful responses — failed empties must not stick forever.
      if (res.ok) {
        sectionCache.set(key, { listings: res.listings, total: res.total });
        patchHomepageVertical(verticalId, res.listings, res.total);
        setListings(res.listings);
        setTotal(res.total);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, loaded, key, verticalId, limit]);

  useRegisterTabRefresh('home', async () => {
    if (!active) return;
    const res = await fetchLatestVertical<HomeListing>(verticalId, limit);
    if (!res.ok) return;
    sectionCache.set(key, { listings: res.listings, total: res.total });
    patchHomepageVertical(verticalId, res.listings, res.total);
    setListings(res.listings);
    setTotal(res.total);
    setLoaded(true);
  });

  return (
    <Box ref={rootRef}>
      <ListingsSection
        verticalId={verticalId}
        total={total}
        isEmpty={loaded && listings.length === 0}
        useMuiVerticalIcon
      >
        {!loaded && listings.length === 0 ? (
          <CarouselSkeleton />
        ) : (
          <ListingsCarousel equalMediaHeight>
            {listings.map((listing) => renderListingCard(verticalId, listing))}
          </ListingsCarousel>
        )}
      </ListingsSection>
    </Box>
  );
}

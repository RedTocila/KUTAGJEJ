'use client';

import * as React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';

import { ListingsCarousel } from '@/components/public/listings-carousel';
import { ListingsSection, type ListingsSectionVerticalId } from '@/components/public/listings-section';
import {
  fetchLatestVertical,
  type HomepageLatestVerticalId,
} from '@/lib/public-listings-client';

const sectionCache = new Map<string, { listings: unknown[]; total: number }>();

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

/**
 * Homepage vertical carousel that loads when scrolled near the viewport.
 * Keeps an in-memory cache so soft navigations back to `/` don’t refetch.
 */
export function LazyHomeSection<T>({
  verticalId,
  limit = 8,
  renderCard,
  initialListings,
  initialTotal,
}: {
  verticalId: HomepageLatestVerticalId & ListingsSectionVerticalId;
  limit?: number;
  renderCard: (listing: T) => React.ReactNode;
  /** When SSR already loaded this vertical, skip the network trip. */
  initialListings?: T[];
  initialTotal?: number;
}) {
  const key = cacheKey(verticalId, limit);
  const cached = sectionCache.get(key);
  const [listings, setListings] = React.useState<T[]>(
    () => initialListings ?? (cached?.listings as T[] | undefined) ?? [],
  );
  const [total, setTotal] = React.useState(
    () => initialTotal ?? cached?.total ?? 0,
  );
  const [loaded, setLoaded] = React.useState(
    () => Boolean(initialListings) || Boolean(cached),
  );
  const [active, setActive] = React.useState(() => Boolean(initialListings) || Boolean(cached));
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
      { rootMargin: '400px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  React.useEffect(() => {
    if (!active || loaded) return;
    let cancelled = false;
    void (async () => {
      const hit = sectionCache.get(key);
      if (hit) {
        if (!cancelled) {
          setListings(hit.listings as T[]);
          setTotal(hit.total);
          setLoaded(true);
        }
        return;
      }
      const res = await fetchLatestVertical<T>(verticalId, limit);
      if (cancelled) return;
      sectionCache.set(key, { listings: res.listings, total: res.total });
      setListings(res.listings);
      setTotal(res.total);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, loaded, key, verticalId, limit]);

  return (
    <Box ref={rootRef}>
      <ListingsSection
        verticalId={verticalId}
        total={total}
        isEmpty={loaded && listings.length === 0}
        useMuiVerticalIcon
      >
        {!loaded ? (
          <CarouselSkeleton />
        ) : (
          <ListingsCarousel>
            {listings.map((listing) => renderCard(listing))}
          </ListingsCarousel>
        )}
      </ListingsSection>
    </Box>
  );
}

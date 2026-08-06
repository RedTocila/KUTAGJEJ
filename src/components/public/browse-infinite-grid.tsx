'use client';

import * as React from 'react';
import { Box, Button, CircularProgress, Grid, Stack } from '@mui/material';

import {
  BROWSE_PAGE_SIZE,
  type BrowseFilters,
  type BrowseOkazionFilters,
} from '@/lib/listing-filters';
import {
  fetchBrowseBusinesses,
  fetchBrowseCars,
  fetchBrowseJobs,
  fetchBrowseMarketplace,
  fetchBrowseOkazion,
  fetchBrowseProfessionals,
  fetchBrowseRealEstate,
} from '@/lib/public-listings-client';

export type BrowseInfiniteVerticalId =
  | 'real-estate'
  | 'cars'
  | 'jobs'
  | 'marketplace'
  | 'businesses'
  | 'professionals'
  | 'okazion';

type ListingWithId = { id: string; kind?: string };

async function fetchPage(
  verticalId: BrowseInfiniteVerticalId,
  filters: BrowseFilters | BrowseOkazionFilters,
  page: number,
): Promise<{ listings: ListingWithId[]; totalPages: number }> {
  switch (verticalId) {
    case 'real-estate':
      return fetchBrowseRealEstate(BROWSE_PAGE_SIZE, filters as BrowseFilters, page);
    case 'cars':
      return fetchBrowseCars(BROWSE_PAGE_SIZE, filters as BrowseFilters, page);
    case 'jobs':
      return fetchBrowseJobs(BROWSE_PAGE_SIZE, filters as BrowseFilters, page);
    case 'marketplace':
      return fetchBrowseMarketplace(BROWSE_PAGE_SIZE, filters as BrowseFilters, page);
    case 'businesses':
      return fetchBrowseBusinesses(BROWSE_PAGE_SIZE, filters as BrowseFilters, page);
    case 'professionals':
      return fetchBrowseProfessionals(BROWSE_PAGE_SIZE, filters as BrowseFilters, page);
    case 'okazion':
      return fetchBrowseOkazion(BROWSE_PAGE_SIZE, filters as BrowseOkazionFilters, page);
    default:
      return { listings: [], totalPages: 1 };
  }
}

function listingKey(listing: ListingWithId) {
  return listing.kind ? `${listing.kind}:${listing.id}` : listing.id;
}

/**
 * First page comes from SSR; further pages append on scroll (or “Load more”).
 */
export function BrowseInfiniteGrid<T extends ListingWithId>({
  verticalId,
  filters,
  initialListings,
  initialPage,
  totalPages,
  renderCard,
}: {
  verticalId: BrowseInfiniteVerticalId;
  filters: BrowseFilters | BrowseOkazionFilters;
  initialListings: T[];
  initialPage: number;
  totalPages: number;
  renderCard: (listing: T) => React.ReactNode;
}) {
  const [listings, setListings] = React.useState<T[]>(initialListings);
  const [page, setPage] = React.useState(initialPage);
  const [pagesTotal, setPagesTotal] = React.useState(totalPages);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const loadingRef = React.useRef(false);

  React.useEffect(() => {
    setListings(initialListings);
    setPage(initialPage);
    setPagesTotal(totalPages);
    setError(false);
  }, [initialListings, initialPage, totalPages, verticalId, filters]);

  const hasMore = page < pagesTotal;

  const loadMore = React.useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError(false);
    try {
      const nextPage = page + 1;
      const res = await fetchPage(verticalId, filters, nextPage);
      setListings((prev) => {
        const seen = new Set(prev.map(listingKey));
        const appended = (res.listings as T[]).filter((l) => !seen.has(listingKey(l)));
        return [...prev, ...appended];
      });
      setPage(nextPage);
      setPagesTotal(res.totalPages);
    } catch {
      setError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [filters, hasMore, page, verticalId]);

  React.useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: '320px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, listings.length]);

  return (
    <Stack spacing={3}>
      <Grid container spacing={{ xs: 2, md: 2.5 }}>
        {listings.map((listing) => (
          <React.Fragment key={listingKey(listing)}>{renderCard(listing)}</React.Fragment>
        ))}
      </Grid>

      {hasMore ? (
        <Box
          ref={sentinelRef}
          sx={{ display: 'flex', justifyContent: 'center', py: 1, minHeight: 48 }}
        >
          {loading ? (
            <CircularProgress size={28} />
          ) : error ? (
            <Button variant="outlined" onClick={() => void loadMore()} sx={{ fontWeight: 700 }}>
              Provo përsëri
            </Button>
          ) : (
            <Button variant="text" onClick={() => void loadMore()} sx={{ fontWeight: 700 }}>
              Shfaq më shumë
            </Button>
          )}
        </Box>
      ) : null}
    </Stack>
  );
}

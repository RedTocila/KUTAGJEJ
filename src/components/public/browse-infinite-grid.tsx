'use client';

import * as React from 'react';
import { Box, Button, Grid, Stack } from '@mui/material';

import { BROWSE_PAGE_SIZE, type BrowseFilters, type BrowseOkazionFilters } from '@/lib/listing-filters';
import {
  fetchBrowseBusinesses,
  fetchBrowseCars,
  fetchBrowseJobs,
  fetchBrowseMarketplace,
  fetchBrowseOkazion,
  fetchBrowseProfessionals,
  fetchBrowseRealEstate,
  type BrowseListingsResult,
  type PublicCarListing,
  type PublicDirectoryListing,
  type PublicJobListing,
  type PublicMarketplaceListing,
  type PublicOkazionListing,
  type PublicRealEstateListing,
} from '@/lib/public-listings-client';
import { useCopy } from '@/hooks/use-copy';
import { ListingCardsSkeleton } from '@/components/core/content-skeletons';
import { useBrowseLoadContext } from '@/components/public/browse-load-context';
import { CarCard } from '@/components/public/listing-cards/car-card';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';

export type BrowseInfiniteVerticalId =
  | 'real-estate'
  | 'cars'
  | 'jobs'
  | 'marketplace'
  | 'businesses'
  | 'professionals'
  | 'okazion';

type BrowseListing =
  | PublicRealEstateListing
  | PublicCarListing
  | PublicJobListing
  | PublicMarketplaceListing
  | PublicDirectoryListing
  | PublicOkazionListing;

function listingKey(listing: BrowseListing) {
  const kind = 'kind' in listing && listing.kind ? listing.kind : '';
  return kind ? `${kind}:${listing.id}` : listing.id;
}

function OkazionCard({ listing, imagePriority = false }: { listing: PublicOkazionListing; imagePriority?: boolean }) {
  switch (listing.kind) {
    case 'real-estate':
      return <RealEstateCard listing={listing} imagePriority={imagePriority} />;
    case 'car':
      return <CarCard listing={listing} imagePriority={imagePriority} />;
    case 'job':
      return <JobCard listing={listing} imagePriority={imagePriority} />;
    case 'marketplace':
      return <MarketplaceCard listing={listing} imagePriority={imagePriority} />;
    default:
      return null;
  }
}

function renderBrowseCard(verticalId: BrowseInfiniteVerticalId, listing: BrowseListing, imagePriority = false) {
  switch (verticalId) {
    case 'real-estate':
      return <RealEstateCard listing={listing as PublicRealEstateListing} imagePriority={imagePriority} />;
    case 'cars':
      return <CarCard listing={listing as PublicCarListing} imagePriority={imagePriority} />;
    case 'jobs':
      return <JobCard listing={listing as PublicJobListing} imagePriority={imagePriority} />;
    case 'marketplace':
      return <MarketplaceCard listing={listing as PublicMarketplaceListing} imagePriority={imagePriority} />;
    case 'businesses':
    case 'professionals':
      return <DirectoryListingCard listing={listing as PublicDirectoryListing} />;
    case 'okazion':
      return <OkazionCard listing={listing as PublicOkazionListing} imagePriority={imagePriority} />;
    default:
      return null;
  }
}

async function fetchPage(
  verticalId: BrowseInfiniteVerticalId,
  filters: BrowseFilters | BrowseOkazionFilters,
  page: number
): Promise<BrowseListingsResult<BrowseListing>> {
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
      return { listings: [], total: 0, page, limit: BROWSE_PAGE_SIZE, totalPages: 1, ok: false };
  }
}

/**
 * First page comes from SSR; further pages append on scroll (or “Load more”).
 * Cards are rendered inside this client module (no function props from the server).
 *
 * When SSR painted an untrusted empty list, we refetch on the client and keep a
 * skeleton up until that request resolves — never flash “no listings yet”.
 */
export function BrowseInfiniteGrid({
  verticalId,
  filters,
  initialListings,
  initialPage,
  totalPages,
}: {
  verticalId: BrowseInfiniteVerticalId;
  filters: BrowseFilters | BrowseOkazionFilters;
  initialListings: BrowseListing[];
  initialPage: number;
  totalPages: number;
}) {
  const t = useCopy();
  const loadCtx = useBrowseLoadContext();
  const recoverEmpty = Boolean(loadCtx?.recoverEmpty) && initialListings.length === 0;
  const [listings, setListings] = React.useState<BrowseListing[]>(initialListings);
  const [page, setPage] = React.useState(initialPage);
  const [pagesTotal, setPagesTotal] = React.useState(totalPages);
  const [loading, setLoading] = React.useState(recoverEmpty);
  const [error, setError] = React.useState(false);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const loadingRef = React.useRef(false);
  const recoveredRef = React.useRef(false);
  const filtersKey = JSON.stringify(filters);
  const routeKey = `${verticalId}:${filtersKey}:${initialPage}`;
  const routeKeyRef = React.useRef(routeKey);
  const reportResolved = loadCtx?.reportResolved;

  const applyFirstPage = React.useCallback(
    (res: BrowseListingsResult<BrowseListing>) => {
      recoveredRef.current = true;
      setListings(res.listings);
      setPage(res.page);
      setPagesTotal(res.totalPages);
      reportResolved?.({
        total: res.total,
        shownCount: res.listings.length,
        totalPages: res.totalPages,
        page: res.page,
        ok: res.ok,
      });
      if (!res.ok && res.listings.length === 0) setError(true);
    },
    [reportResolved]
  );

  React.useEffect(() => {
    const routeChanged = routeKeyRef.current !== routeKey;
    routeKeyRef.current = routeKey;
    if (!routeChanged && recoveredRef.current) return;
    recoveredRef.current = false;
    setListings(initialListings);
    setPage(initialPage);
    setPagesTotal(totalPages);
    setError(false);
    setLoading(initialListings.length === 0 && recoverEmpty);
  }, [routeKey, initialListings, initialPage, totalPages, recoverEmpty]);

  React.useEffect(() => {
    if (!recoverEmpty || initialListings.length > 0 || recoveredRef.current) return;
    let cancelled = false;
    void (async () => {
      loadingRef.current = true;
      setLoading(true);
      setError(false);
      try {
        const res = await fetchPage(verticalId, filters, initialPage);
        if (cancelled) return;
        applyFirstPage(res);
      } catch {
        if (!cancelled) {
          setError(true);
          reportResolved?.({
            total: 0,
            shownCount: 0,
            totalPages: 1,
            page: initialPage,
            ok: false,
          });
        }
      } finally {
        loadingRef.current = false;
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    recoverEmpty,
    verticalId,
    filters,
    filtersKey,
    initialPage,
    initialListings.length,
    applyFirstPage,
    reportResolved,
  ]);

  const recovering = recoverEmpty && listings.length === 0 && (loading || error);
  const hasMore = !recovering && page < pagesTotal;

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
        const appended = res.listings.filter((l) => !seen.has(listingKey(l)));
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

  const retryFirstPage = React.useCallback(() => {
    setError(false);
    setLoading(true);
    void (async () => {
      loadingRef.current = true;
      try {
        const res = await fetchPage(verticalId, filters, initialPage);
        applyFirstPage(res);
      } catch {
        setError(true);
        reportResolved?.({
          total: 0,
          shownCount: 0,
          totalPages: 1,
          page: initialPage,
          ok: false,
        });
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    })();
  }, [applyFirstPage, filters, initialPage, reportResolved, verticalId]);

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
      { rootMargin: '320px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, listings.length]);

  if (recovering && error && !loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <Button variant="outlined" onClick={retryFirstPage} sx={{ fontWeight: 700 }}>
          {t.browse.retryLoad}
        </Button>
      </Box>
    );
  }

  if (recovering) {
    return <ListingCardsSkeleton count={8} />;
  }

  return (
    <Stack spacing={3}>
      <Grid container spacing={{ xs: 2, md: 2.5 }}>
        {listings.map((listing, index) => (
          <Grid key={listingKey(listing)} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            {renderBrowseCard(verticalId, listing, index === 0)}
          </Grid>
        ))}
      </Grid>

      {hasMore ? (
        <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 1, minHeight: 48 }}>
          {loading ? (
            <Box sx={{ width: '100%' }}>
              <ListingCardsSkeleton count={4} />
            </Box>
          ) : error ? (
            <Button variant="outlined" onClick={() => void loadMore()} sx={{ fontWeight: 700 }}>
              {t.browse.retryLoad}
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

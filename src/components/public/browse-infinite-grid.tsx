'use client';

import * as React from 'react';
import { Box, Button, Grid, Stack } from '@mui/material';

import { ListingCardsSkeleton } from '@/components/core/content-skeletons';
import { CarCard } from '@/components/public/listing-cards/car-card';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
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
  type PublicCarListing,
  type PublicDirectoryListing,
  type PublicJobListing,
  type PublicMarketplaceListing,
  type PublicOkazionListing,
  type PublicRealEstateListing,
} from '@/lib/public-listings-client';

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

function OkazionCard({ listing }: { listing: PublicOkazionListing }) {
  switch (listing.kind) {
    case 'real-estate':
      return <RealEstateCard listing={listing} />;
    case 'car':
      return <CarCard listing={listing} />;
    case 'job':
      return <JobCard listing={listing} />;
    case 'marketplace':
      return <MarketplaceCard listing={listing} />;
    default:
      return null;
  }
}

function renderBrowseCard(verticalId: BrowseInfiniteVerticalId, listing: BrowseListing) {
  switch (verticalId) {
    case 'real-estate':
      return <RealEstateCard listing={listing as PublicRealEstateListing} />;
    case 'cars':
      return <CarCard listing={listing as PublicCarListing} />;
    case 'jobs':
      return <JobCard listing={listing as PublicJobListing} />;
    case 'marketplace':
      return <MarketplaceCard listing={listing as PublicMarketplaceListing} />;
    case 'businesses':
    case 'professionals':
      return <DirectoryListingCard listing={listing as PublicDirectoryListing} />;
    case 'okazion':
      return <OkazionCard listing={listing as PublicOkazionListing} />;
    default:
      return null;
  }
}

async function fetchPage(
  verticalId: BrowseInfiniteVerticalId,
  filters: BrowseFilters | BrowseOkazionFilters,
  page: number,
): Promise<{ listings: BrowseListing[]; totalPages: number }> {
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

/**
 * First page comes from SSR; further pages append on scroll (or “Load more”).
 * Cards are rendered inside this client module (no function props from the server).
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
  const [listings, setListings] = React.useState<BrowseListing[]>(initialListings);
  const [page, setPage] = React.useState(initialPage);
  const [pagesTotal, setPagesTotal] = React.useState(totalPages);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const loadingRef = React.useRef(false);
  const filtersKey = JSON.stringify(filters);

  React.useEffect(() => {
    setListings(initialListings);
    setPage(initialPage);
    setPagesTotal(totalPages);
    setError(false);
  }, [initialListings, initialPage, totalPages, verticalId, filtersKey]);

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
          <Grid key={listingKey(listing)} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            {renderBrowseCard(verticalId, listing)}
          </Grid>
        ))}
      </Grid>

      {hasMore ? (
        <Box
          ref={sentinelRef}
          sx={{ display: 'flex', justifyContent: 'center', py: 1, minHeight: 48 }}
        >
          {loading ? (
            <Box sx={{ width: '100%' }}>
              <ListingCardsSkeleton count={4} />
            </Box>
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

import * as React from 'react';
import { Box, Skeleton, Stack, Typography } from '@mui/material';

import {
  fetchLatestBusinesses,
  fetchLatestCars,
  fetchLatestJobs,
  fetchLatestMarketplace,
  fetchLatestProfessionals,
  fetchLatestRealEstate,
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

export type SimilarListingsKind = 'real-estate' | 'cars' | 'jobs' | 'marketplace' | 'businesses' | 'professionals';

const SIMILAR_FETCH = 12;
const SIMILAR_SHOW = 10;

/** Placeholder while similar listings stream in under the detail hero. */
export function SimilarListingsSkeleton(): React.JSX.Element {
  return (
    <Stack spacing={1.5} component="aside" aria-busy aria-label="Duke u ngarkuar" sx={{ pt: 1 }}>
      <Skeleton variant="text" animation="wave" width={200} height={32} />
      <Stack direction="row" spacing={2} sx={{ overflow: 'hidden' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Box key={i} sx={{ minWidth: 260, flex: '0 0 auto' }}>
            <Skeleton variant="rounded" animation="wave" height={180} sx={{ borderRadius: 3 }} />
            <Skeleton width="70%" sx={{ mt: 1.5 }} />
            <Skeleton width="40%" />
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

export function similarListingsSlot(kind: SimilarListingsKind, excludeId: string, title: string): React.ReactNode {
  return (
    <React.Suspense fallback={<SimilarListingsSkeleton />}>
      <SimilarListingsSection kind={kind} excludeId={excludeId} title={title} />
    </React.Suspense>
  );
}

export async function SimilarListingsSection({
  kind,
  excludeId,
  title,
}: {
  kind: SimilarListingsKind;
  excludeId: string;
  title: string;
}): Promise<React.JSX.Element | null> {
  const pool = await fetchSimilarPool(kind);
  const similar = pool.filter((item) => item.id !== excludeId).slice(0, SIMILAR_SHOW);
  if (similar.length === 0) return null;

  return (
    <Stack spacing={1.5} component="aside" aria-label={title} sx={{ pt: 1 }}>
      <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.3 }}>{title}</Typography>
      <Box
        sx={{
          mx: { xs: -2, sm: -3, md: 0 },
          px: { xs: 2, sm: 3, md: 0 },
          '& > div > div': { py: '8px 0 0 !important' },
        }}
      >
        <ListingsCarousel>
          {kind === 'real-estate'
            ? (similar as PublicRealEstateListing[]).map((item) => <RealEstateCard key={item.id} listing={item} />)
            : kind === 'cars'
              ? (similar as PublicCarListing[]).map((item) => <CarCard key={item.id} listing={item} />)
              : kind === 'jobs'
                ? (similar as PublicJobListing[]).map((item) => (
                    <JobCard key={item.id} listing={item} variant="carousel" />
                  ))
                : kind === 'marketplace'
                  ? (similar as PublicMarketplaceListing[]).map((item) => (
                      <MarketplaceCard key={item.id} listing={item} />
                    ))
                  : (similar as PublicDirectoryListing[]).map((item) => (
                      <DirectoryListingCard key={item.id} listing={item} />
                    ))}
        </ListingsCarousel>
      </Box>
    </Stack>
  );
}

async function fetchSimilarPool(kind: SimilarListingsKind) {
  switch (kind) {
    case 'real-estate':
      return fetchLatestRealEstate(SIMILAR_FETCH);
    case 'cars':
      return fetchLatestCars(SIMILAR_FETCH);
    case 'jobs':
      return fetchLatestJobs(SIMILAR_FETCH);
    case 'marketplace':
      return fetchLatestMarketplace(SIMILAR_FETCH);
    case 'businesses':
      return fetchLatestBusinesses(SIMILAR_FETCH);
    case 'professionals':
      return fetchLatestProfessionals(SIMILAR_FETCH);
    default:
      return [];
  }
}

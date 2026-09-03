'use client';

import * as React from 'react';
import { Box, Container, Typography } from '@mui/material';

import type { HomeVerticalId } from '@/lib/home-categories';
import type {
  PublicCarListing,
  PublicDirectoryListing,
  PublicJobListing,
  PublicMarketplaceListing,
  PublicRealEstateListing,
  TopViewedListing,
} from '@/lib/public-listings-client';
import { useCopy } from '@/hooks/use-copy';
import { CarCard } from '@/components/public/listing-cards/car-card';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import { ListingsCarousel } from '@/components/public/listings-carousel';

function isRatingFeaturedVertical(verticalId: HomeVerticalId): boolean {
  return verticalId === 'businesses' || verticalId === 'professionals';
}

function TopViewedCard({ verticalId, listing }: { verticalId: HomeVerticalId; listing: TopViewedListing }) {
  switch (verticalId) {
    case 'real-estate':
      return <RealEstateCard listing={listing as PublicRealEstateListing} variant="homepage" />;
    case 'cars':
      return <CarCard listing={listing as PublicCarListing} variant="homepage" />;
    case 'jobs':
      return <JobCard listing={listing as PublicJobListing} variant="homepage" />;
    case 'marketplace':
      return <MarketplaceCard listing={listing as PublicMarketplaceListing} variant="homepage" />;
    case 'businesses':
    case 'professionals':
      return (
        <DirectoryListingCard
          listing={listing as PublicDirectoryListing}
          variant="homepage"
          showActionCounts
        />
      );
    default:
      return null;
  }
}

/**
 * Most-viewed (or highest-rated) row on category browse pages —
 * same borderless ListingsCarousel card style as the jobs page.
 */
export function CategoryTopViewedSlider({
  verticalId,
  listings,
}: {
  verticalId: HomeVerticalId;
  listings: TopViewedListing[];
}) {
  const t = useCopy();
  const byRating = isRatingFeaturedVertical(verticalId);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const total = listings.length;

  if (total === 0) return null;

  const slideLabel = `${Math.min(activeIndex + 1, total)}-${total}`;

  return (
    <Box
      component="section"
      aria-label={byRating ? t.browse.highestRatedAria : t.browse.mostViewedAria}
      sx={{
        pt: { xs: 2, md: 2.5 },
        pb: 0,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflowX: 'hidden',
      }}
    >
      <Container maxWidth="xl" sx={{ minWidth: 0, px: { xs: 2, md: 3, lg: 4 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 1.5,
            mb: { xs: 0.5, md: 0.75 },
          }}
        >
          <Typography
            component="h2"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '0.95rem', md: '1.05rem' },
              letterSpacing: '-0.01em',
            }}
          >
            {byRating ? t.browse.highestRated : t.browse.mostViewed}
          </Typography>
          {total > 1 ? (
            <Typography
              component="span"
              aria-live="polite"
              aria-atomic="true"
              sx={{
                flexShrink: 0,
                fontWeight: 600,
                fontSize: { xs: '0.8rem', md: '0.85rem' },
                fontVariantNumeric: 'tabular-nums',
                color: 'text.secondary',
                letterSpacing: '0.02em',
              }}
            >
              {slideLabel}
            </Typography>
          ) : null}
        </Box>
        <ListingsCarousel
          slotWidth={{ xs: 260, sm: 280, md: 300 }}
          onActiveIndexChange={setActiveIndex}
        >
          {listings.map((listing) => (
            <TopViewedCard key={listing.id} verticalId={verticalId} listing={listing} />
          ))}
        </ListingsCarousel>
      </Container>
    </Box>
  );
}

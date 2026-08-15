'use client';

import * as React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';

import { fetchBrowseOkazion, type PublicOkazionListing } from '@/lib/public-listings-client';
import { CarCard } from '@/components/public/listing-cards/car-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { ListingsSection } from '@/components/public/listings-section';

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

/** Homepage OKAZION strip — active flash deals across sellable categories. */
export function HomepageOkazionSection({
  listings: initialListings,
  total: initialTotal,
  ssrOk = true,
}: {
  listings: PublicOkazionListing[];
  total: number;
  /** False when SSR fetch failed (empty is not trustworthy). */
  ssrOk?: boolean;
}) {
  const needsRecovery = initialListings.length === 0 && !ssrOk;
  const [listings, setListings] = React.useState(initialListings);
  const [total, setTotal] = React.useState(initialTotal);
  const [loading, setLoading] = React.useState(needsRecovery);

  React.useEffect(() => {
    if (!needsRecovery) return;
    let cancelled = false;
    void (async () => {
      const res = await fetchBrowseOkazion(8);
      if (cancelled) return;
      setListings(res.listings);
      setTotal(res.total);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [needsRecovery]);

  return (
    <ListingsSection
      verticalId="okazion"
      total={total}
      isEmpty={!loading && listings.length === 0}
      titleKey="okazionListings"
      useMuiVerticalIcon
      hideSubcategoryPills
    >
      {loading ? (
        <CarouselSkeleton />
      ) : (
        <ListingsCarousel>
          {listings.map((listing) => (
            <OkazionCard key={`${listing.kind}:${listing.id}`} listing={listing} />
          ))}
        </ListingsCarousel>
      )}
    </ListingsSection>
  );
}

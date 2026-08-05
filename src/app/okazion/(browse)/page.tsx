import * as React from 'react';
import type { Metadata } from 'next';
import { Grid } from '@mui/material';

import { CategoryBrowseGrid, CategoryBrowseLayout } from '@/components/public/category-browse-layout';
import { CarCard } from '@/components/public/listing-cards/car-card';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import {
  BROWSE_PAGE_SIZE,
  hasActiveBrowseFilters,
  parseBrowsePage,
  parseOkazionBrowseParams,
} from '@/lib/listing-filters';
import {
  fetchBrowseOkazion,
  type PublicOkazionListing,
} from '@/lib/public-listings-client';
import { paths } from '@/paths';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'OKAZION | KuTaGjej',
  description: 'Oferta të shpejta — njoftime OKAZION për 5 ditë nga të gjitha kategoritë.',
  alternates: { canonical: paths.public.okazion },
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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
    case 'businesses':
    case 'professionals':
      return <DirectoryListingCard listing={listing} />;
    default:
      return null;
  }
}

export default async function OkazionBrowsePage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const filters = parseOkazionBrowseParams(sp);
  const page = parseBrowsePage(sp);
  const hasFilters = hasActiveBrowseFilters(filters);
  const { listings, total, page: currentPage, totalPages } = await fetchBrowseOkazion(
    BROWSE_PAGE_SIZE,
    filters,
    page,
  );

  return (
    <CategoryBrowseLayout
      verticalId="okazion"
      total={total}
      shownCount={listings.length}
      page={currentPage}
      totalPages={totalPages}
      pageSize={BROWSE_PAGE_SIZE}
      hasFilters={hasFilters}
      cities={[]}
    >
      <CategoryBrowseGrid>
        {listings.map((listing) => (
          <Grid key={`${listing.kind}:${listing.id}`} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <OkazionCard listing={listing} />
          </Grid>
        ))}
      </CategoryBrowseGrid>
    </CategoryBrowseLayout>
  );
}

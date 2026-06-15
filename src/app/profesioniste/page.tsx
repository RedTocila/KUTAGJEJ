import * as React from 'react';
import type { Metadata } from 'next';
import { Grid } from '@mui/material';

import { CategoryBrowseGrid, CategoryBrowseLayout } from '@/components/public/category-browse-layout';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { generateBrowseMetadata } from '@/lib/browse-page-seo';
import {
  BROWSE_PAGE_SIZE,
  hasActiveBrowseFilters,
  parseBrowsePage,
  parseBrowseSearchParams,
} from '@/lib/listing-filters';
import { fetchBrowseProfessionals } from '@/lib/public-listings-client';
import { fetchPublicCities } from '@/lib/real-estate-locations-server';
import { paths } from '@/paths';

export const revalidate = 60;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  return generateBrowseMetadata('professionals', (await searchParams) ?? {}, paths.public.professionals);
}

export default async function ProfessionalsBrowsePage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const filters = parseBrowseSearchParams('professionals', sp);
  const page = parseBrowsePage(sp);
  const hasFilters = hasActiveBrowseFilters(filters);

  const [{ listings, total, page: currentPage, totalPages }, cities] = await Promise.all([
    fetchBrowseProfessionals(BROWSE_PAGE_SIZE, filters, page),
    fetchPublicCities(),
  ]);

  return (
    <CategoryBrowseLayout
      verticalId="professionals"
      total={total}
      shownCount={listings.length}
      page={currentPage}
      totalPages={totalPages}
      pageSize={BROWSE_PAGE_SIZE}
      hasFilters={hasFilters}
      cities={cities}
    >
      <CategoryBrowseGrid>
        {listings.map((listing) => (
          <Grid key={listing.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <DirectoryListingCard listing={listing} />
          </Grid>
        ))}
      </CategoryBrowseGrid>
    </CategoryBrowseLayout>
  );
}

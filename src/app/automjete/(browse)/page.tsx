import * as React from 'react';
import type { Metadata } from 'next';
import { Grid } from '@mui/material';

import { BrowseInfiniteGrid } from '@/components/public/browse-infinite-grid';
import { CategoryBrowseLayout } from '@/components/public/category-browse-layout';
import { CarCard } from '@/components/public/listing-cards/car-card';
import { generateBrowseMetadata } from '@/lib/browse-page-seo';
import {
  BROWSE_PAGE_SIZE,
  hasActiveBrowseFilters,
  parseBrowsePage,
  parseBrowseSearchParams,
} from '@/lib/listing-filters';
import { fetchBrowseCars, fetchTopViewedListings } from '@/lib/public-listings-client';
import { fetchPublicCities } from '@/lib/real-estate-locations-server';
import { paths } from '@/paths';

export const revalidate = 60;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  return generateBrowseMetadata('cars', (await searchParams) ?? {}, paths.public.cars);
}

export default async function CarsBrowsePage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const filters = parseBrowseSearchParams('cars', sp);
  const page = parseBrowsePage(sp);
  const hasFilters = hasActiveBrowseFilters(filters);

  const [{ listings, total, page: currentPage, totalPages }, cities, topViewed] = await Promise.all([
    fetchBrowseCars(BROWSE_PAGE_SIZE, filters, page),
    fetchPublicCities(),
    fetchTopViewedListings('cars'),
  ]);

  return (
    <CategoryBrowseLayout
      verticalId="cars"
      total={total}
      shownCount={listings.length}
      page={currentPage}
      totalPages={totalPages}
      pageSize={BROWSE_PAGE_SIZE}
      hasFilters={hasFilters}
      cities={cities}
      topViewed={topViewed}
      enableInfiniteScroll
    >
      <BrowseInfiniteGrid
        verticalId="cars"
        filters={filters}
        initialListings={listings}
        initialPage={currentPage}
        totalPages={totalPages}
        renderCard={(listing) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <CarCard listing={listing} />
          </Grid>
        )}
      />
    </CategoryBrowseLayout>
  );
}

import * as React from 'react';
import type { Metadata } from 'next';
import { Grid } from '@mui/material';

import { CategoryBrowseGrid, CategoryBrowseLayout } from '@/components/public/category-browse-layout';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { generateBrowseMetadata } from '@/lib/browse-page-seo';
import { hasActiveBrowseFilters, parseBrowseSearchParams } from '@/lib/listing-filters';
import { fetchBrowseJobs } from '@/lib/public-listings-client';
import { fetchPublicCities } from '@/lib/real-estate-locations-server';
import { paths } from '@/paths';

export const revalidate = 60;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  return generateBrowseMetadata('jobs', (await searchParams) ?? {}, paths.public.jobs);
}

export default async function JobsBrowsePage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const filters = parseBrowseSearchParams('jobs', sp);
  const hasFilters = hasActiveBrowseFilters(filters);

  const [{ listings, total }, cities] = await Promise.all([
    fetchBrowseJobs(24, filters),
    fetchPublicCities(),
  ]);

  return (
    <CategoryBrowseLayout
      verticalId="jobs"
      total={total}
      shownCount={listings.length}
      hasFilters={hasFilters}
      cities={cities}
    >
      <CategoryBrowseGrid>
        {listings.map((listing) => (
          <Grid key={listing.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <JobCard listing={listing} />
          </Grid>
        ))}
      </CategoryBrowseGrid>
    </CategoryBrowseLayout>
  );
}

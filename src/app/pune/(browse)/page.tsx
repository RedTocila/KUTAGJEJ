import * as React from 'react';
import type { Metadata } from 'next';

import { paths } from '@/paths';
import { generateBrowseMetadata } from '@/lib/browse-page-seo';
import { skipIsrOnFailedBrowse } from '@/lib/browse-ssr';
import {
  BROWSE_PAGE_SIZE,
  hasActiveBrowseFilters,
  parseBrowsePage,
  parseBrowseSearchParams,
} from '@/lib/listing-filters';
import { fetchBrowseJobs, fetchTopViewedListings } from '@/lib/public-listings-client';
import { fetchPublicCities } from '@/lib/real-estate-locations-server';
import { BrowseInfiniteGrid } from '@/components/public/browse-infinite-grid';
import { CategoryBrowseLayout } from '@/components/public/category-browse-layout';

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
  const page = parseBrowsePage(sp);
  const hasFilters = hasActiveBrowseFilters(filters);

  const [{ listings, total, page: currentPage, totalPages, ok }, cities, topViewed] = await Promise.all([
    fetchBrowseJobs(BROWSE_PAGE_SIZE, filters, page),
    fetchPublicCities(),
    fetchTopViewedListings('jobs'),
  ]);
  skipIsrOnFailedBrowse(ok);

  return (
    <CategoryBrowseLayout
      verticalId="jobs"
      total={total}
      shownCount={listings.length}
      page={currentPage}
      totalPages={totalPages}
      pageSize={BROWSE_PAGE_SIZE}
      hasFilters={hasFilters}
      cities={cities}
      topViewed={topViewed}
      ssrOk={ok}
    >
      <BrowseInfiniteGrid verticalId="jobs" filters={filters} initialListings={listings} initialPage={currentPage} />
    </CategoryBrowseLayout>
  );
}

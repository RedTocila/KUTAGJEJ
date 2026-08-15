import * as React from 'react';
import type { Metadata } from 'next';

import { BrowseInfiniteGrid } from '@/components/public/browse-infinite-grid';
import { CategoryBrowseLayout } from '@/components/public/category-browse-layout';
import { skipIsrOnFailedBrowse } from '@/lib/browse-ssr';
import {
  BROWSE_PAGE_SIZE,
  hasActiveBrowseFilters,
  parseBrowsePage,
  parseOkazionBrowseParams,
} from '@/lib/listing-filters';
import { fetchBrowseOkazion } from '@/lib/public-listings-client';
import { paths } from '@/paths';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'OKAZION | KuTaGjej',
  description: 'Oferta të shpejta — njoftime OKAZION për 5 ditë: prona, makina, punë dhe tregu.',
  alternates: { canonical: paths.public.okazion },
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OkazionBrowsePage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const filters = parseOkazionBrowseParams(sp);
  const page = parseBrowsePage(sp);
  const hasFilters = hasActiveBrowseFilters(filters);
  const { listings, total, page: currentPage, totalPages, ok } = await fetchBrowseOkazion(
    BROWSE_PAGE_SIZE,
    filters,
    page,
  );
  skipIsrOnFailedBrowse(ok);

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
      enableInfiniteScroll
      ssrOk={ok}
    >
      <BrowseInfiniteGrid
        verticalId="okazion"
        filters={filters}
        initialListings={listings}
        initialPage={currentPage}
        totalPages={totalPages}
      />
    </CategoryBrowseLayout>
  );
}

import * as React from 'react';
import type { Metadata } from 'next';

import { CategoryBrowseLayout } from '@/components/public/category-browse-layout';
import { MembersBrowseGrid } from '@/components/public/members-browse-grid';
import { skipIsrOnFailedBrowse } from '@/lib/browse-ssr';
import { BROWSE_PAGE_SIZE, formatBrowseKeywords, parseBrowsePage } from '@/lib/listing-filters';
import { fetchPublicMemberSearch } from '@/lib/public-member-client';
import { config } from '@/config';
import { paths } from '@/paths';

export const revalidate = 60;

export const metadata: Metadata = {
  title: `Profile | ${config.site.name}`,
  description: 'Shfleto profilet publike të anëtarëve dhe bizneseve në KuTaGjej.',
  alternates: { canonical: paths.public.profiles },
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MembersBrowsePage({ searchParams }: PageProps): Promise<React.JSX.Element> {
  const sp = (await searchParams) ?? {};
  const query = formatBrowseKeywords(sp.q);
  const page = parseBrowsePage(sp);
  const hasFilters = Boolean(query);

  const { members, total, page: currentPage, totalPages, ok } = await fetchPublicMemberSearch(
    query,
    BROWSE_PAGE_SIZE,
    page,
  );
  skipIsrOnFailedBrowse(ok);

  return (
    <CategoryBrowseLayout
      verticalId="profiles"
      total={total}
      shownCount={members.length}
      page={currentPage}
      totalPages={totalPages}
      pageSize={BROWSE_PAGE_SIZE}
      hasFilters={hasFilters}
      cities={[]}
      enableInfiniteScroll
      ssrOk={ok}
    >
      <MembersBrowseGrid
        query={query}
        initialMembers={members}
        initialPage={currentPage}
        totalPages={totalPages}
      />
    </CategoryBrowseLayout>
  );
}

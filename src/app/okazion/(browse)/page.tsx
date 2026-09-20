import type { Metadata } from 'next';

import { config } from '@/config';
import { paths } from '@/paths';
import { skipIsrOnFailedBrowse } from '@/lib/browse-ssr';
import {
  BROWSE_PAGE_SIZE,
  hasActiveBrowseFilters,
  parseBrowsePage,
  parseOkazionBrowseParams,
} from '@/lib/listing-filters';
import { fetchBrowseOkazion } from '@/lib/public-listings-client';
import { OKAZION_SEO_COPY } from '@/lib/public-seo-copy';
import { brandOgImageUrl } from '@/lib/public-vertical-listing-metadata';
import { BrowseInfiniteGrid } from '@/components/public/browse-infinite-grid';
import { CategoryBrowseLayout } from '@/components/public/category-browse-layout';

export const revalidate = 300;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = (await searchParams) ?? {};
  const filters = parseOkazionBrowseParams(sp);
  const page = parseBrowsePage(sp);
  const indexable = !hasActiveBrowseFilters(filters) && page === 1;
  const title = page > 1 ? `Okazion — Faqja ${page}` : 'Okazion';
  const description = OKAZION_SEO_COPY.subtext;
  const canonicalPath = page > 1 ? `${paths.public.okazion}?page=${page}` : paths.public.okazion;
  const canonicalUrl = new URL(canonicalPath.replace(/^\//, ''), config.site.url).toString();
  const ogImage = brandOgImageUrl();

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: { index: indexable, follow: true },
    openGraph: {
      title: `${title} | ${config.site.name}`,
      description,
      url: canonicalUrl,
      type: 'website',
      locale: 'sq_AL',
      siteName: config.site.name,
      images: [{ url: ogImage, alt: config.site.name, width: 512, height: 512 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${config.site.name}`,
      description,
      images: [ogImage],
    },
  };
}

export default async function OkazionBrowsePage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const filters = parseOkazionBrowseParams(sp);
  const page = parseBrowsePage(sp);
  const hasFilters = hasActiveBrowseFilters(filters);
  const {
    listings,
    total,
    page: currentPage,
    totalPages,
    ok,
  } = await fetchBrowseOkazion(BROWSE_PAGE_SIZE, filters, page);
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
      ssrOk={ok}
    >
      <BrowseInfiniteGrid verticalId="okazion" filters={filters} initialListings={listings} initialPage={currentPage} />
    </CategoryBrowseLayout>
  );
}

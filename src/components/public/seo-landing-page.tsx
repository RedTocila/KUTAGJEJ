import * as React from 'react';
import { notFound } from 'next/navigation';
import { Breadcrumbs, Container, Link as MuiLink, Stack, Typography } from '@mui/material';

import { config as siteConfig } from '@/config';
import { BROWSE_PAGE_SIZE, hasActiveBrowseFilters, parseBrowsePage } from '@/lib/listing-filters';
import {
  fetchPublicSeoIndex,
  fetchSeoLandingListings,
  seoLandingMetadata,
  type PublicSeoIndex,
  type SeoLandingConfig,
} from '@/lib/public-seo';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { BrowseInfiniteGrid } from '@/components/public/browse-infinite-grid';
import { CategoryBrowseLayout } from '@/components/public/category-browse-layout';

export function seoLandingJsonLd(config: SeoLandingConfig, total: number) {
  const homeUrl = '/';
  const canonicalUrl = new URL(config.path.replace(/^\//, ''), siteConfig.site.url).toString();
  const verticalPath = `/${config.path.split('/').filter(Boolean).slice(0, 1).join('/')}`;
  const crumbs = [
    { '@type': 'ListItem', position: 1, name: 'Kryefaqja', item: new URL(homeUrl, siteConfig.site.url).toString() },
    {
      '@type': 'ListItem',
      position: 2,
      name: config.vertical,
      item: new URL(verticalPath.replace(/^\//, ''), siteConfig.site.url).toString(),
    },
    { '@type': 'ListItem', position: 3, name: config.heading, item: canonicalUrl },
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: config.heading,
    description: config.description,
    url: canonicalUrl,
    numberOfItems: total,
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: crumbs },
  };
}

function contextualLinks(config: SeoLandingConfig, index: PublicSeoIndex | null) {
  if (!index) return [];
  const verticalPrefix = config.path.split('/').slice(0, 2).join('/');
  return index.landings
    .filter((landing) => landing.path.startsWith(`${verticalPrefix}/`) && landing.path !== config.path)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function listingData(result: Awaited<ReturnType<typeof fetchSeoLandingListings>>) {
  return {
    listings: result.listings,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    ok: result.ok,
  };
}

export async function renderSeoLandingPage(
  config: SeoLandingConfig,
  cities: RealEstateCityDto[],
  searchParams: Record<string, string | string[] | undefined> = {}
): Promise<React.ReactNode> {
  const page = parseBrowsePage(searchParams);
  const [result, index] = await Promise.all([fetchSeoLandingListings(config, page), fetchPublicSeoIndex()]);
  const data = listingData(result);
  if (data.ok && data.total === 0) {
    notFound();
  }

  const links = contextualLinks(config, index);
  const jsonLd = JSON.stringify(seoLandingJsonLd(config, data.total)).replace(/</g, '\\u003c');

  return (
    <>
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <CategoryBrowseLayout
        verticalId={config.vertical}
        total={data.total}
        shownCount={data.listings.length}
        page={data.page}
        totalPages={data.totalPages}
        pageSize={BROWSE_PAGE_SIZE}
        hasFilters={hasActiveBrowseFilters(config.filters)}
        cities={cities}
        ssrOk={data.ok}
        heading={config.heading}
        intro={config.description}
      >
        <Container maxWidth="xl" sx={{ pb: 1 }}>
          <Stack spacing={1}>
            <Breadcrumbs aria-label="Vendndodhja e faqes">
              <MuiLink href="/" underline="hover" color="inherit">
                Kryefaqja
              </MuiLink>
              <MuiLink
                href={`/${config.path.split('/').filter(Boolean).slice(0, 1).join('/')}`}
                underline="hover"
                color="inherit"
              >
                {config.vertical}
              </MuiLink>
              <Typography color="text.primary">{config.heading}</Typography>
            </Breadcrumbs>
            {links.length ? (
              <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {links.map((link) => (
                  <MuiLink key={link.path} href={link.path} underline="hover">
                    {link.path.split('/').at(-1)?.replaceAll('-', ' ')}
                  </MuiLink>
                ))}
              </Stack>
            ) : null}
          </Stack>
        </Container>
        <BrowseInfiniteGrid
          verticalId={config.vertical}
          filters={config.filters}
          initialListings={data.listings}
          initialPage={data.page}
        />
      </CategoryBrowseLayout>
    </>
  );
}

export { seoLandingMetadata };

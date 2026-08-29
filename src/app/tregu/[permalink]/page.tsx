import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { config } from '@/config';
import { paths, pathsPublicVerticalListingDetail } from '@/paths';
import { loadPublicMarketplaceListingById } from '@/lib/public-listings-client';
import { buildVerticalListingDetailMetadata } from '@/lib/public-vertical-listing-metadata';
import { mongoIdFromPublicListingSegment, normalizeListingPermalinkSegment } from '@/lib/real-estate-permalink';
import { PublicShell } from '@/components/public/public-shell';
import { similarListingsSlot } from '@/components/public/similar-listings-section';
import { VerticalListingDetailView } from '@/components/public/vertical-listing-detail-view';
import { renderSeoLandingPage } from '@/components/public/seo-landing-page';
import { PublicListingContextLinks } from '@/components/public/public-listing-context-links';
import { loadSeoLandingRoute, seoLandingMetadata } from '@/lib/public-seo';
import { publicListingJsonLd } from '@/lib/public-listing-jsonld';

export const revalidate = 60;

type PageProps = {
  params: Promise<{ permalink: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function descSnippet(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 158);
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { permalink } = await params;
  const id = mongoIdFromPublicListingSegment(permalink);
  if (!id) {
    const landing = await loadSeoLandingRoute('marketplace', [permalink]);
    if (!landing.config) notFound();
    return seoLandingMetadata(
      landing.config,
      landing.result?.total ?? 0,
      Boolean(Object.keys((await searchParams) ?? {}).length === 0 && landing.result?.ok && (landing.result?.total ?? 0) >= 3),
    );
  }
  const { data: listing, unavailable } = await loadPublicMarketplaceListingById(id);
  if (unavailable) {
    notFound();
  }
  if (!listing) {
    notFound();
  }
  const pathHref = listing.permalinkPath?.trim()
    ? pathsPublicVerticalListingDetail(paths.public.marketplace, listing.permalinkPath.trim())
    : pathsPublicVerticalListingDetail(paths.public.marketplace, listing.id);
  return buildVerticalListingDetailMetadata({
    title: `${listing.title}${listing.cityName ? ` në ${listing.cityName}` : ''}`,
    descriptionSnippet:
      descSnippet(`${listing.description} ${listing.category}${listing.cityName ? ` në ${listing.cityName}` : ''}`) ||
      listing.title,
    pathHref,
    imageUrls: listing.imageUrls,
    imageUrl: listing.imageUrl,
  });
}

export default async function MarketplaceListingPage({ params }: PageProps): Promise<React.ReactNode> {
  const { permalink } = await params;
  const id = mongoIdFromPublicListingSegment(permalink);
  if (!id) {
    const landing = await loadSeoLandingRoute('marketplace', [permalink]);
    if (!landing.config) notFound();
    return renderSeoLandingPage(landing.config, landing.cities);
  }

  const loaded = await loadPublicMarketplaceListingById(id);
  if (loaded.unavailable) {
    notFound();
  }
  const listing = loaded.data;
  if (!listing) notFound();

  const requestedNorm = normalizeListingPermalinkSegment(permalink);
  const canonRaw = listing.permalinkPath?.trim() ?? '';
  if (canonRaw) {
    const canonNorm = normalizeListingPermalinkSegment(canonRaw);
    if (requestedNorm !== canonNorm) {
      redirect(pathsPublicVerticalListingDetail(paths.public.marketplace, canonRaw));
    }
  }

  const pathHref = canonRaw
    ? pathsPublicVerticalListingDetail(paths.public.marketplace, canonRaw)
    : pathsPublicVerticalListingDetail(paths.public.marketplace, listing.id);
  const canonicalUrl = `${config.site.url.replace(/\/$/, '')}${pathHref}`;
  const jsonLdHtml = JSON.stringify(publicListingJsonLd(listing, canonicalUrl)).replace(/</g, '\\u003c');

  return (
    <>
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: jsonLdHtml }} />
      <PublicShell hideHeaderBelowMd>
        <PublicListingContextLinks listing={listing} title="Tregu" />
        <VerticalListingDetailView
          listing={listing}
          canonicalUrl={canonicalUrl}
          browseHref={paths.public.marketplace}
          similarSectionTitle="Artikuj të ngjashëm në treg"
          similarSlot={similarListingsSlot('marketplace', listing.id, 'Artikuj të ngjashëm në treg')}
        />
      </PublicShell>
    </>
  );
}

import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { config } from '@/config';
import { pathsPublicRealEstateListingDetail } from '@/paths';
import { loadPublicRealEstateListingById } from '@/lib/public-listings-client';
import { buildRealEstateListingMetadata, realEstateListingJsonLd } from '@/lib/real-estate-listing-seo';
import { mongoIdFromPronaDynamicSegment, normalizeListingPermalinkSegment } from '@/lib/real-estate-permalink';
import { PublicShell } from '@/components/public/public-shell';
import { RealEstateListingDetailView } from '@/components/public/real-estate-listing-detail-view';
import { PublicListingContextLinks } from '@/components/public/public-listing-context-links';
import { similarListingsSlot } from '@/components/public/similar-listings-section';
import { renderSeoLandingPage } from '@/components/public/seo-landing-page';
import { loadSeoLandingRoute, seoLandingMetadata } from '@/lib/public-seo';

export const revalidate = 60;

type PageProps = {
  params: Promise<{ permalink: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { permalink } = await params;
  const id = mongoIdFromPronaDynamicSegment(permalink);
  if (!id) {
    const landing = await loadSeoLandingRoute('real-estate', [permalink]);
    if (!landing.config) notFound();
    return seoLandingMetadata(
      landing.config,
      landing.result?.total ?? 0,
      Boolean(
        Object.keys((await searchParams) ?? {}).length === 0 &&
          landing.result?.ok &&
          (landing.result?.total ?? 0) >= 3,
      ),
    );
  }

  const { data: listing, unavailable } = await loadPublicRealEstateListingById(id);
  if (unavailable) {
    notFound();
  }
  if (!listing) {
    notFound();
  }

  return buildRealEstateListingMetadata(listing);
}

export default async function RealEstateListingPage({ params }: PageProps): Promise<React.ReactNode> {
  const { permalink } = await params;

  const id = mongoIdFromPronaDynamicSegment(permalink);
  if (!id) {
    const landing = await loadSeoLandingRoute('real-estate', [permalink]);
    if (!landing.config) notFound();
    return renderSeoLandingPage(landing.config, landing.cities);
  }

  const loaded = await loadPublicRealEstateListingById(id);

  if (loaded.unavailable) {
    notFound();
  }

  const listing = loaded.data;
  if (!listing) notFound();

  const requestedNorm = normalizeListingPermalinkSegment(permalink);
  const canonRaw = listing.permalinkPath?.trim() ?? '';

  /** When API provides `permalinkPath`, keep one canonical URL (includes legacy `/prona/{objectId}`). */
  if (canonRaw) {
    const canonNorm = normalizeListingPermalinkSegment(canonRaw);
    if (requestedNorm !== canonNorm) {
      redirect(pathsPublicRealEstateListingDetail(canonRaw));
    }
  }

  const pathHref = canonRaw ? pathsPublicRealEstateListingDetail(canonRaw) : `/prona/${encodeURIComponent(listing.id)}`;
  const canonicalUrl = `${config.site.url.replace(/\/$/, '')}${pathHref}`;
  const jsonLd = realEstateListingJsonLd(listing, canonicalUrl);
  const jsonLdHtml = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    <>
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: jsonLdHtml }} />
      <PublicShell hideHeaderBelowMd hideMobileNav>
        <PublicListingContextLinks listing={listing} title="Prona" />
        <RealEstateListingDetailView
          listing={listing}
          canonicalUrl={canonicalUrl}
          similarSlot={similarListingsSlot('real-estate', listing.id, 'Prona të ngjashme')}
        />
      </PublicShell>
    </>
  );
}

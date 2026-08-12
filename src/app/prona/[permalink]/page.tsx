import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { PublicLoadErrorView } from '@/components/public/public-load-error-view';
import { PublicShell } from '@/components/public/public-shell';
import { RealEstateListingDetailView } from '@/components/public/real-estate-listing-detail-view';
import { config } from '@/config';
import { mongoIdFromPronaDynamicSegment, normalizeListingPermalinkSegment } from '@/lib/real-estate-permalink';
import {
  buildRealEstateListingMetadata,
  realEstateListingJsonLd,
} from '@/lib/real-estate-listing-seo';
import {
  fetchLatestRealEstate,
  loadPublicRealEstateListingById,
} from '@/lib/public-listings-client';
import { pathsPublicRealEstateListingDetail } from '@/paths';

export const revalidate = 60;

type PageProps = {
  params: Promise<{ permalink: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { permalink } = await params;
  const id = mongoIdFromPronaDynamicSegment(permalink);
  if (!id) {
    return {
      title: 'Njoftim i padisponueshëm',
      description: 'Ky adresë nuk përmban një njoftime të vlefshme.',
      robots: { index: false, follow: true },
    };
  }

  const { data: listing, unavailable } = await loadPublicRealEstateListingById(id);
  if (unavailable) {
    return {
      title: 'Duke ngarkuar njoftimin',
      robots: { index: false, follow: true },
    };
  }
  if (!listing) {
    return {
      title: 'Njoftim i padisponueshëm',
      description: 'Ky njoftime për pronë nuk është më i disponueshëm.',
      robots: { index: false, follow: true },
    };
  }

  return buildRealEstateListingMetadata(listing);
}

export default async function RealEstateListingPage({ params }: PageProps): Promise<React.ReactNode> {
  const { permalink } = await params;

  const id = mongoIdFromPronaDynamicSegment(permalink);
  if (!id) notFound();

  const [loaded, similarPool] = await Promise.all([
    loadPublicRealEstateListingById(id),
    fetchLatestRealEstate(28),
  ]);

  if (loaded.unavailable) {
    return (
      <PublicShell hideHeaderBelowMd>
        <PublicLoadErrorView title="Njoftimi nuk u ngarkua" />
      </PublicShell>
    );
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

  const similar = similarPool.filter((l) => l.id !== listing.id).slice(0, 10);

  const pathHref = canonRaw
    ? pathsPublicRealEstateListingDetail(canonRaw)
    : `/prona/${encodeURIComponent(listing.id)}`;
  const canonicalUrl = `${config.site.url.replace(/\/$/, '')}${pathHref}`;
  const jsonLd = realEstateListingJsonLd(listing, canonicalUrl);
  const jsonLdHtml = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdHtml }}
      />
      <PublicShell hideHeaderBelowMd>
        <RealEstateListingDetailView listing={listing} similar={similar} canonicalUrl={canonicalUrl} />
      </PublicShell>
    </>
  );
}

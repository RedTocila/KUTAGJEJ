import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { PublicLoadErrorView } from '@/components/public/public-load-error-view';
import { PublicShell } from '@/components/public/public-shell';
import { VerticalListingDetailView } from '@/components/public/vertical-listing-detail-view';
import { config } from '@/config';
import { mongoIdFromPublicListingSegment, normalizeListingPermalinkSegment } from '@/lib/real-estate-permalink';
import { buildVerticalListingDetailMetadata } from '@/lib/public-vertical-listing-metadata';
import { fetchLatestMarketplace, loadPublicMarketplaceListingById } from '@/lib/public-listings-client';
import { paths, pathsPublicVerticalListingDetail } from '@/paths';

export const revalidate = 60;

type PageProps = { params: Promise<{ permalink: string }> };

function descSnippet(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 158);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { permalink } = await params;
  const id = mongoIdFromPublicListingSegment(permalink);
  if (!id) {
    return {
      title: 'Njoftim i padisponueshëm',
      description: 'Ky adresë nuk përmban një njoftime të vlefshme.',
      robots: { index: false, follow: true },
    };
  }
  const { data: listing, unavailable } = await loadPublicMarketplaceListingById(id);
  if (unavailable) {
    return { title: 'Duke ngarkuar njoftimin', robots: { index: false, follow: true } };
  }
  if (!listing) {
    return {
      title: 'Njoftim i padisponueshëm',
      description: 'Ky artikull në treg nuk është më i disponueshëm.',
      robots: { index: false, follow: true },
    };
  }
  const pathHref = listing.permalinkPath?.trim()
    ? pathsPublicVerticalListingDetail(paths.public.marketplace, listing.permalinkPath.trim())
    : pathsPublicVerticalListingDetail(paths.public.marketplace, listing.id);
  return buildVerticalListingDetailMetadata({
    title: listing.title,
    descriptionSnippet: descSnippet(listing.description) || listing.title,
    pathHref,
    imageUrls: listing.imageUrls,
    imageUrl: listing.imageUrl,
  });
}

export default async function MarketplaceListingPage({ params }: PageProps): Promise<React.ReactNode> {
  const { permalink } = await params;
  const id = mongoIdFromPublicListingSegment(permalink);
  if (!id) notFound();

  const [loaded, pool] = await Promise.all([
    loadPublicMarketplaceListingById(id),
    fetchLatestMarketplace(28),
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
  const similar = pool.filter((l) => l.id !== listing.id).slice(0, 10);

  return (
    <PublicShell hideHeaderBelowMd>
      <VerticalListingDetailView
        listing={listing}
        canonicalUrl={canonicalUrl}
        browseHref={paths.public.marketplace}
        similarSectionTitle="Artikuj të ngjashëm në treg"
        similar={similar}
      />
    </PublicShell>
  );
}

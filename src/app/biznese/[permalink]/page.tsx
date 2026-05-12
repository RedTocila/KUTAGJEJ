import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { PublicShell } from '@/components/public/public-shell';
import { VerticalListingDetailView } from '@/components/public/vertical-listing-detail-view';
import { config } from '@/config';
import { mongoIdFromPublicListingSegment, normalizeListingPermalinkSegment } from '@/lib/real-estate-permalink';
import { buildVerticalListingDetailMetadata } from '@/lib/public-vertical-listing-metadata';
import { fetchLatestBusinesses, fetchPublicBusinessListingById } from '@/lib/public-listings-client';
import { mapDirectoryToSimilarStrip } from '@/lib/vertical-detail-similar-strip';
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
  const listing = await fetchPublicBusinessListingById(id);
  if (!listing) {
    return {
      title: 'Njoftim i padisponueshëm',
      description: 'Ky biznes nuk është më i listuar.',
      robots: { index: false, follow: true },
    };
  }
  const pathHref = listing.permalinkPath?.trim()
    ? pathsPublicVerticalListingDetail(paths.public.businesses, listing.permalinkPath.trim())
    : pathsPublicVerticalListingDetail(paths.public.businesses, listing.id);
  return buildVerticalListingDetailMetadata({
    title: listing.title,
    descriptionSnippet: descSnippet(listing.description) || listing.title,
    pathHref,
  });
}

export default async function BusinessListingPage({ params }: PageProps): Promise<React.ReactNode> {
  const { permalink } = await params;
  const id = mongoIdFromPublicListingSegment(permalink);
  if (!id) notFound();

  const [listing, pool] = await Promise.all([
    fetchPublicBusinessListingById(id),
    fetchLatestBusinesses(28),
  ]);
  if (!listing) notFound();

  const requestedNorm = normalizeListingPermalinkSegment(permalink);
  const canonRaw = listing.permalinkPath?.trim() ?? '';
  if (canonRaw) {
    const canonNorm = normalizeListingPermalinkSegment(canonRaw);
    if (requestedNorm !== canonNorm) {
      redirect(pathsPublicVerticalListingDetail(paths.public.businesses, canonRaw));
    }
  }

  const pathHref = canonRaw
    ? pathsPublicVerticalListingDetail(paths.public.businesses, canonRaw)
    : pathsPublicVerticalListingDetail(paths.public.businesses, listing.id);
  const canonicalUrl = `${config.site.url.replace(/\/$/, '')}${pathHref}`;
  const similar = mapDirectoryToSimilarStrip(pool, listing.id, 'businesses');

  return (
    <PublicShell hideHeaderBelowMd>
      <VerticalListingDetailView
        listing={listing}
        canonicalUrl={canonicalUrl}
        browseHref={paths.public.businesses}
        similarSectionTitle="Biznese të fundit"
        similar={similar}
      />
    </PublicShell>
  );
}

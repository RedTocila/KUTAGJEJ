import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { PublicShell } from '@/components/public/public-shell';
import { BusinessMenuFullPage } from '@/components/public/business-menu-section';
import { config } from '@/config';
import { mongoIdFromPublicListingSegment, normalizeListingPermalinkSegment } from '@/lib/real-estate-permalink';
import { fetchPublicBusinessListingById } from '@/lib/public-listings-client';
import { listingBusinessMenuHref, paths, pathsPublicVerticalListingDetail } from '@/paths';

export const revalidate = 0;

type PageProps = { params: Promise<{ permalink: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { permalink } = await params;
  const id = mongoIdFromPublicListingSegment(permalink);
  if (!id) {
    return { title: 'Menu e padisponueshme', robots: { index: false, follow: true } };
  }
  const listing = await fetchPublicBusinessListingById(id);
  if (!listing) {
    return { title: 'Menu e padisponueshme', robots: { index: false, follow: true } };
  }
  return {
    title: `Menu · ${listing.title}`,
    description: `Menuja e plotë për ${listing.title}`,
    alternates: {
      canonical: `${config.site.url.replace(/\/$/, '')}${listingBusinessMenuHref(listing)}`,
    },
  };
}

export default async function BusinessMenuPage({ params }: PageProps): Promise<React.ReactNode> {
  const { permalink } = await params;
  const id = mongoIdFromPublicListingSegment(permalink);
  if (!id) notFound();

  const listing = await fetchPublicBusinessListingById(id);
  if (!listing) notFound();

  const requestedNorm = normalizeListingPermalinkSegment(permalink);
  const canonRaw = listing.permalinkPath?.trim() ?? '';
  if (canonRaw) {
    const canonNorm = normalizeListingPermalinkSegment(canonRaw);
    if (requestedNorm !== canonNorm) {
      redirect(`${pathsPublicVerticalListingDetail(paths.public.businesses, canonRaw)}/menu`);
    }
  }

  return (
    <PublicShell hideHeaderBelowMd>
      <BusinessMenuFullPage listing={listing} />
    </PublicShell>
  );
}

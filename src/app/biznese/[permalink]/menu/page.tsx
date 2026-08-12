import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { PublicLoadErrorView } from '@/components/public/public-load-error-view';
import { PublicShell } from '@/components/public/public-shell';
import { BusinessMenuFullPage } from '@/components/public/business-menu-section';
import { config } from '@/config';
import { mongoIdFromPublicListingSegment, normalizeListingPermalinkSegment } from '@/lib/real-estate-permalink';
import { loadPublicBusinessListingById } from '@/lib/public-listings-client';
import { listingBusinessMenuHref, paths, pathsPublicVerticalListingDetail } from '@/paths';

export const revalidate = 0;

type PageProps = { params: Promise<{ permalink: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { permalink } = await params;
  const id = mongoIdFromPublicListingSegment(permalink);
  if (!id) {
    return { title: 'Menu e padisponueshme', robots: { index: false, follow: true } };
  }
  const { data: listing, unavailable } = await loadPublicBusinessListingById(id);
  if (unavailable) {
    return { title: 'Duke ngarkuar menunë', robots: { index: false, follow: true } };
  }
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

  const loaded = await loadPublicBusinessListingById(id);
  if (loaded.unavailable) {
    return (
      <PublicShell hideHeaderBelowMd>
        <PublicLoadErrorView title="Menuja nuk u ngarkua" />
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
      redirect(`${pathsPublicVerticalListingDetail(paths.public.businesses, canonRaw)}/menu`);
    }
  }

  return (
    <PublicShell hideHeaderBelowMd>
      <BusinessMenuFullPage listing={listing} />
    </PublicShell>
  );
}

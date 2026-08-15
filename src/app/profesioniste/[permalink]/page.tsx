import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { config } from '@/config';
import { paths, pathsPublicVerticalListingDetail } from '@/paths';
import { loadPublicProfessionalListingById } from '@/lib/public-listings-client';
import { buildVerticalListingDetailMetadata } from '@/lib/public-vertical-listing-metadata';
import { mongoIdFromPublicListingSegment, normalizeListingPermalinkSegment } from '@/lib/real-estate-permalink';
import { ProfessionalListingDetailView } from '@/components/public/professional-listing-detail-view';
import { PublicLoadErrorView } from '@/components/public/public-load-error-view';
import { PublicShell } from '@/components/public/public-shell';
import { similarListingsSlot } from '@/components/public/similar-listings-section';

export const revalidate = 0;

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
  const { data: listing, unavailable } = await loadPublicProfessionalListingById(id);
  if (unavailable) {
    return { title: 'Duke ngarkuar njoftimin', robots: { index: false, follow: true } };
  }
  if (!listing) {
    return {
      title: 'Njoftim i padisponueshëm',
      description: 'Ky profesionist nuk është më i listuar.',
      robots: { index: false, follow: true },
    };
  }
  const pathHref = listing.permalinkPath?.trim()
    ? pathsPublicVerticalListingDetail(paths.public.professionals, listing.permalinkPath.trim())
    : pathsPublicVerticalListingDetail(paths.public.professionals, listing.id);
  return buildVerticalListingDetailMetadata({
    title: listing.title,
    descriptionSnippet: descSnippet(listing.description) || listing.title,
    pathHref,
    imageUrls: listing.imageUrls,
    imageUrl: listing.imageUrl,
  });
}

export default async function ProfessionalListingPage({ params }: PageProps): Promise<React.ReactNode> {
  const { permalink } = await params;
  const id = mongoIdFromPublicListingSegment(permalink);
  if (!id) notFound();

  const loaded = await loadPublicProfessionalListingById(id);
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
      redirect(pathsPublicVerticalListingDetail(paths.public.professionals, canonRaw));
    }
  }

  const pathHref = canonRaw
    ? pathsPublicVerticalListingDetail(paths.public.professionals, canonRaw)
    : pathsPublicVerticalListingDetail(paths.public.professionals, listing.id);
  const canonicalUrl = `${config.site.url.replace(/\/$/, '')}${pathHref}`;
  return (
    <PublicShell hideHeaderBelowMd>
      <ProfessionalListingDetailView
        listing={listing}
        canonicalUrl={canonicalUrl}
        similarSlot={similarListingsSlot('professionals', listing.id, 'Profesionistë të ngjashëm')}
        similarSlotDesktop={similarListingsSlot('professionals', listing.id, 'Profesionistë të ngjashëm')}
      />
    </PublicShell>
  );
}

import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { PublicLoadErrorView } from '@/components/public/public-load-error-view';
import { PublicShell } from '@/components/public/public-shell';
import { JobListingDetailView } from '@/components/public/job-listing-detail-view';
import { config } from '@/config';
import { mongoIdFromPublicListingSegment, normalizeListingPermalinkSegment } from '@/lib/real-estate-permalink';
import { buildVerticalListingDetailMetadata } from '@/lib/public-vertical-listing-metadata';
import { fetchLatestJobs, loadPublicJobListingById } from '@/lib/public-listings-client';
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
  const { data: listing, unavailable } = await loadPublicJobListingById(id);
  if (unavailable) {
    return { title: 'Duke ngarkuar njoftimin', robots: { index: false, follow: true } };
  }
  if (!listing) {
    return {
      title: 'Njoftim i padisponueshëm',
      description: 'Ky njoftime për punë nuk është më i disponueshëm.',
      robots: { index: false, follow: true },
    };
  }
  const pathHref = listing.permalinkPath?.trim()
    ? pathsPublicVerticalListingDetail(paths.public.jobs, listing.permalinkPath.trim())
    : pathsPublicVerticalListingDetail(paths.public.jobs, listing.id);
  return buildVerticalListingDetailMetadata({
    title: listing.title,
    descriptionSnippet: descSnippet(listing.description) || listing.title,
    pathHref,
    imageUrls: listing.imageUrls,
    imageUrl: listing.imageUrl,
  });
}

export default async function JobListingPage({ params }: PageProps): Promise<React.ReactNode> {
  const { permalink } = await params;
  const id = mongoIdFromPublicListingSegment(permalink);
  if (!id) notFound();

  const [loaded, jobsPool] = await Promise.all([loadPublicJobListingById(id), fetchLatestJobs(28)]);
  if (loaded.unavailable) {
    return (
      <PublicShell hideHeaderBelowMd>
        <PublicLoadErrorView title="Njoftimi nuk u ngarkua" />
      </PublicShell>
    );
  }
  const listing = loaded.data;
  if (!listing) notFound();

  const similar = jobsPool.filter((l) => l.id !== listing.id).slice(0, 10);

  const requestedNorm = normalizeListingPermalinkSegment(permalink);
  const canonRaw = listing.permalinkPath?.trim() ?? '';
  if (canonRaw) {
    const canonNorm = normalizeListingPermalinkSegment(canonRaw);
    if (requestedNorm !== canonNorm) {
      redirect(pathsPublicVerticalListingDetail(paths.public.jobs, canonRaw));
    }
  }

  const pathHref = canonRaw
    ? pathsPublicVerticalListingDetail(paths.public.jobs, canonRaw)
    : pathsPublicVerticalListingDetail(paths.public.jobs, listing.id);
  const canonicalUrl = `${config.site.url.replace(/\/$/, '')}${pathHref}`;
  return (
    <PublicShell hideHeaderBelowMd>
      <JobListingDetailView listing={listing} canonicalUrl={canonicalUrl} similar={similar} />
    </PublicShell>
  );
}

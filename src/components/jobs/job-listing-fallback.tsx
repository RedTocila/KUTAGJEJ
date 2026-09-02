'use client';

import * as React from 'react';

import { JobHiringPosterMockup } from '@/components/jobs/job-hiring-poster-mockup';

export { JOB_LISTING_COVER_ASPECT_RATIO, JOB_POSTER_ASPECT_RATIO } from '@/lib/job-listing-cover';

export type JobListingFallbackVariant = 'default' | 'card';

export type JobListingFallbackProps = {
  title?: string | null;
  companyName?: string | null;
  industry?: string | null;
  requiredRoles?: string[] | null;
  cityName?: string | null;
  zoneName?: string | null;
  locationAddress?: string | null;
  experience?: string | null;
  education?: string | null;
  jobType?: string | null;
  salary?: number | null;
  currency?: 'EUR' | 'LEK' | null;
  /** @deprecated Map fields kept for call-site compatibility; poster uses city/address only. */
  mapsUrl?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  variant?: JobListingFallbackVariant;
  listingId?: string | null;
  posterColorSeed?: number | null;
  /** Random preview while building — not used after the listing is saved. */
  previewSeed?: number | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  bumpedAt?: string | null;
};

/** Photo-free job cover — hiring poster filled from listing fields. */
export function JobListingFallback(props: JobListingFallbackProps) {
  const {
    title,
    companyName,
    requiredRoles,
    cityName,
    zoneName,
    locationAddress,
    experience,
    education,
    jobType,
    salary,
    currency,
    variant = 'default',
    listingId,
    posterColorSeed,
    previewSeed,
    expiresAt,
    createdAt,
    bumpedAt,
  } = props;

  return (
    <JobHiringPosterMockup
      variant={variant}
      title={title}
      companyName={companyName}
      requiredRoles={requiredRoles}
      cityName={cityName}
      zoneName={zoneName}
      locationAddress={locationAddress}
      experience={experience}
      education={education}
      jobType={jobType}
      salary={salary}
      currency={currency}
      listingId={listingId}
      posterColorSeed={posterColorSeed}
      previewSeed={previewSeed}
      expiresAt={expiresAt}
      createdAt={createdAt}
      bumpedAt={bumpedAt}
    />
  );
}

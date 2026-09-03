'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Stack, Typography } from '@mui/material';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Clock as ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';

import { listingJobPublicHref } from '@/paths';
import { JobListingFallback } from '@/components/jobs/job-listing-fallback';
import { resolveJobCoverIcon } from '@/lib/job-industry-icons';
import {
  JOB_INDUSTRY_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import { getJobListingExpiresAt } from '@/lib/job-listing-expiry';
import { jobListingCoverImageUrl, jobListingUsesMockupCover } from '@/lib/job-listing-cover';
import type { PublicJobListing } from '@/lib/public-listings-client';
import { ListingCardLink } from '@/components/public/listing-card-link';

import { CardMedia, LISTING_CARD_BROWSE_MEDIA_HEIGHT } from './card-media';
import { CardShell } from './card-shell';
import { findOptionLabel, formatPrice } from './format-helpers';
import { JobListingCountdownPlaceholder } from './job-listing-countdown';
import type { ListingCardRatingSummary } from './listing-card-rating';
import { ListingCardHomepageBody } from './listing-card-homepage-body';
import { type Spec } from './spec-row';

export type JobCardVariant = 'default' | 'cover' | 'compact' | 'carousel' | 'homepage' | 'browse';

const JobListingCountdown = dynamic(
  () => import('./job-listing-countdown').then((m) => ({ default: m.JobListingCountdown })),
  {
    ssr: false,
    loading: () => <JobListingCountdownPlaceholder variant="overlay" bare showClock />,
  }
);

/** Full-width expiry strip along the bottom edge of the job card image. */
function JobExpiryAnnouncementBar({ expiresAt }: { expiresAt: string }) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        width: '100%',
        boxSizing: 'border-box',
        alignItems: 'center',
        justifyContent: 'center',
        px: 1.1,
        py: 0.65,
        bgcolor: 'rgba(0,0,0,0.72)',
        borderTop: '1px solid rgba(255,255,255,0.16)',
        backdropFilter: 'blur(8px)',
        color: '#fff',
      }}
    >
      <JobListingCountdown expiresAt={expiresAt} variant="overlay" bare showClock />
    </Stack>
  );
}

function SalarySuffix({ salary }: { salary: number | null | undefined }) {
  if (salary == null) return null;
  return (
    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.35, fontWeight: 500 }}>
      / muaj
    </Typography>
  );
}

export function JobCard({
  listing,
  sellerRating: _sellerRating = null,
  imagePriority = false,
  variant = 'default',
  locationInPriceRow: _locationInPriceRow = false,
}: {
  listing: PublicJobListing;
  sellerRating?: ListingCardRatingSummary | null;
  imagePriority?: boolean;
  /** All variants render the borderless media card; density only changes media crop. */
  variant?: JobCardVariant;
  locationInPriceRow?: boolean;
}) {
  const viewCount = listing.viewCount ?? 0;
  const industryLabel = findOptionLabel(JOB_INDUSTRY_OPTIONS, listing.industry);
  const jobTypeLabel = findOptionLabel(JOB_TYPE_OPTIONS, listing.jobType);
  const workLocationLabel = findOptionLabel(WORK_LOCATION_OPTIONS, listing.workLocation);
  const locationLabel = [listing.zoneName, listing.cityName].filter(Boolean).join(', ');
  const salaryLabel =
    listing.salary != null ? `${formatPrice(listing.salary, listing.currency)} / muaj` : formatPrice(null, null);
  const CoverIcon = resolveJobCoverIcon(listing.title, listing.industry);
  const usesMockupCover = jobListingUsesMockupCover(listing);
  const displayImageUrl = jobListingCoverImageUrl(listing);
  const expiresAt = listing.isOkazion
    ? listing.okazionUntil || listing.expiresAt || getJobListingExpiresAt(listing.createdAt).toISOString()
    : (listing.expiresAt ?? getJobListingExpiresAt(listing.createdAt).toISOString());

  const homepageLike = variant === 'homepage' || variant === 'carousel';
  const squareLike = variant === 'compact';
  const browseLike = !homepageLike && !squareLike;

  const fullSpecs: Spec[] = [
    ...(jobTypeLabel ? [{ Icon: ClockIcon, label: jobTypeLabel, title: jobTypeLabel }] : []),
    ...(industryLabel ? [{ Icon: BriefcaseIcon, label: industryLabel, title: industryLabel }] : []),
    ...(workLocationLabel ? [{ Icon: BuildingsIcon, label: workLocationLabel, title: workLocationLabel }] : []),
  ];

  const sharePayload = React.useMemo(
    () => ({
      listingKind: 'job' as const,
      listingId: listing.id,
      title: listing.title,
      category: industryLabel,
      priceLabel: salaryLabel,
      badge: jobTypeLabel,
      imageUrl: displayImageUrl,
      location: locationLabel || listing.cityName || undefined,
      specs: [
        ...(jobTypeLabel ? [{ icon: 'clock' as const, label: jobTypeLabel }] : []),
        ...(industryLabel ? [{ icon: 'briefcase' as const, label: industryLabel }] : []),
        ...(workLocationLabel ? [{ icon: 'buildings' as const, label: workLocationLabel }] : []),
      ],
      createdAt: listing.createdAt,
      viewCount,
      saveCount: listing.saveCount,
      contactPhone: listing.contactPhone?.trim() || undefined,
      url: listingJobPublicHref(listing),
      ...(displayImageUrl
        ? {}
        : {
            jobMockup: {
              industry: listing.industry,
              requiredRoles: listing.requiredRoles,
              description: listing.description,
            },
          }),
    }),
    [
      displayImageUrl,
      industryLabel,
      jobTypeLabel,
      listing.cityName,
      listing.contactPhone,
      listing.createdAt,
      listing.description,
      listing.id,
      listing.industry,
      listing.requiredRoles,
      listing.saveCount,
      listing.title,
      locationLabel,
      salaryLabel,
      viewCount,
      workLocationLabel,
    ]
  );

  return (
    <ListingCardLink
      listingKind="job"
      listingId={listing.id}
      href={listingJobPublicHref(listing)}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      <CardShell compact premium={Boolean(listing.isPremium)} okazion={Boolean(listing.isOkazion)}>
        <CardMedia
          listingKind="job"
          listingId={listing.id}
          imageUrl={displayImageUrl}
          FallbackIcon={CoverIcon}
          fallbackContent={
            usesMockupCover ? (
              <JobListingFallback
                listingId={listing.id}
                title={listing.title}
                industry={listing.industry}
                requiredRoles={listing.requiredRoles}
                description={listing.description}
              />
            ) : undefined
          }
          alt={listing.title}
          height={browseLike ? LISTING_CARD_BROWSE_MEDIA_HEIGHT : undefined}
          aspectRatio={homepageLike ? '6 / 5' : squareLike ? '1 / 1' : undefined}
          compact
          showActionCounts
          okazionCountdownCompact={false}
          shareCount={listing.shareCount}
          saveCount={listing.saveCount}
          saved={listing.saved}
          premium={Boolean(listing.isPremium)}
          okazion={Boolean(listing.isOkazion)}
          okazionUntil={listing.okazionUntil}
          sellerVerified={Boolean(listing.sellerVerified)}
          bottomOverlay={
            listing.isOkazion ? undefined : <JobExpiryAnnouncementBar expiresAt={expiresAt} />
          }
          priority={imagePriority}
          sharePayload={sharePayload}
        />
        <ListingCardHomepageBody
          title={listing.title}
          price={listing.salary}
          currency={listing.currency}
          density={homepageLike ? 'carousel' : 'compact'}
          priceSuffix={<SalarySuffix salary={listing.salary} />}
          location={locationLabel || listing.cityName}
          specs={fullSpecs}
          listing={listing}
          viewCount={viewCount}
        />
      </CardShell>
    </ListingCardLink>
  );
}

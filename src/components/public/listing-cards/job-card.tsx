'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Box, Stack, Typography } from '@mui/material';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Clock as ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { GraduationCap as GraduationCapIcon } from '@phosphor-icons/react/dist/ssr/GraduationCap';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Path as PathIcon } from '@phosphor-icons/react/dist/ssr/Path';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';

import { listingJobPublicHref } from '@/paths';
import {
  JOB_EDUCATION_OPTIONS,
  JOB_EXPERIENCE_OPTIONS,
  JOB_INDUSTRY_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import { getJobListingExpiresAt } from '@/lib/job-listing-expiry';
import type { PublicJobListing } from '@/lib/public-listings-client';
import { ListingCardLink } from '@/components/public/listing-card-link';

import { CardDescription } from './card-description';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import { findOptionLabel, formatPrice, listingCardRelativeDate } from './format-helpers';
import { JobListingCountdownPlaceholder } from './job-listing-countdown';
import { ListingCardRating, resolveListingCardRating, type ListingCardRatingSummary } from './listing-card-rating';
import { ListingPrice } from './listing-price';
import { ListingTitleWithVerified } from './listing-title-with-verified';
import { SpecRow, type Spec } from './spec-row';

const JobListingCountdown = dynamic(() => import('./job-listing-countdown').then((m) => m.JobListingCountdown), {
  ssr: false,
  loading: () => <JobListingCountdownPlaceholder variant="overlay" bare />,
});
function workLocationIcon(value: string) {
  if (value === 'remote') return HouseIcon;
  if (value === 'hybrid') return PathIcon;
  return BuildingsIcon;
}

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
      }}
    >
      <JobListingCountdown expiresAt={expiresAt} variant="overlay" bare showClock />
    </Stack>
  );
}

export function JobCard({
  listing,
  sellerRating = null,
  imagePriority = false,
  variant = 'default',
}: {
  listing: PublicJobListing;
  sellerRating?: ListingCardRatingSummary | null;
  imagePriority?: boolean;
  /** `'cover'` is the square crop used on the jobs browse page. Homepage stays `'default'`. */
  variant?: 'default' | 'cover';
}) {
  const viewCount = listing.viewCount ?? 0;
  const industryLabel = findOptionLabel(JOB_INDUSTRY_OPTIONS, listing.industry);
  const jobTypeLabel = findOptionLabel(JOB_TYPE_OPTIONS, listing.jobType);
  const workLocationLabel = findOptionLabel(WORK_LOCATION_OPTIONS, listing.workLocation);
  const experienceLabel = findOptionLabel(JOB_EXPERIENCE_OPTIONS, listing.experience);
  const educationLabel = findOptionLabel(JOB_EDUCATION_OPTIONS, listing.education);
  const salaryLabel =
    listing.salary != null ? `${formatPrice(listing.salary, listing.currency)} / muaj` : 'Pagë e diskutueshme';
  const expiresAt = listing.expiresAt ?? getJobListingExpiresAt(listing.createdAt).toISOString();
  const cardRating = resolveListingCardRating(null, sellerRating);

  const WorkLocationIcon = workLocationIcon(listing.workLocation);

  const specs: Spec[] = [
    { Icon: ClockIcon, label: jobTypeLabel, title: 'Tipi i punës' },
    { Icon: WorkLocationIcon, label: workLocationLabel, title: 'Vendi i punës' },
    { Icon: StarIcon, label: experienceLabel, title: 'Eksperienca' },
    ...(listing.education && listing.education !== 'no-requirement'
      ? [{ Icon: GraduationCapIcon, label: educationLabel, title: 'Arsimi' }]
      : []),
  ];

  return (
    <ListingCardLink
      listingKind="job"
      listingId={listing.id}
      href={listingJobPublicHref(listing)}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      <CardShell premium={Boolean(listing.isPremium)} okazion={Boolean(listing.isOkazion)}>
        <CardMedia
          listingKind="job"
          listingId={listing.id}
          imageUrl={listing.imageUrl}
          FallbackIcon={BriefcaseIcon}
          alt={listing.title}
          aspectRatio={variant === 'cover' ? '1 / 1' : '4 / 3'}
          topLeftBadge={jobTypeLabel}
          shareCount={listing.shareCount}
          saveCount={listing.saveCount}
          saved={listing.saved}
          premium={Boolean(listing.isPremium)}
          okazion={Boolean(listing.isOkazion)}
          okazionUntil={listing.okazionUntil}
          sellerVerified={Boolean(listing.sellerVerified)}
          bottomOverlay={
            !listing.isOkazion ? <JobExpiryAnnouncementBar expiresAt={expiresAt} /> : undefined
          }
          priority={imagePriority}
          sharePayload={{
            title: listing.title,
            category: industryLabel,
            priceLabel: salaryLabel,
            badge: jobTypeLabel,
            imageUrl: listing.imageUrl,
            location: listing.cityName || undefined,
            specs: [
              { icon: 'clock', label: jobTypeLabel },
              {
                icon:
                  listing.workLocation === 'remote'
                    ? 'house'
                    : listing.workLocation === 'hybrid'
                      ? 'path'
                      : 'buildings',
                label: workLocationLabel,
              },
              { icon: 'star', label: experienceLabel },
              ...(listing.education && listing.education !== 'no-requirement'
                ? [{ icon: 'graduation' as const, label: educationLabel }]
                : []),
            ],
            createdAt: listing.createdAt,
            viewCount,
            saveCount: listing.saveCount,
            contactPhone: listing.contactPhone?.trim() || undefined,
            url: listingJobPublicHref(listing),
          }}
        />
        <Stack className="listing-card-body" spacing={1} sx={{ p: 1.75 }}>
          <ListingTitleWithVerified title={listing.title} maxLines={1} verified={false} />
          {cardRating ? (
            <ListingCardRating ratingAverage={cardRating.ratingAverage} reviewCount={cardRating.reviewCount} />
          ) : null}
          {listing.salary != null ? (
            <ListingPrice
              price={listing.salary}
              currency={listing.currency}
              isPremium={listing.isPremium}
              isOkazion={listing.isOkazion}
              fontSize="1rem"
              suffix={
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 500 }}>
                  / muaj
                </Typography>
              }
            />
          ) : (
            <Stack direction="row" sx={{ alignItems: 'center' }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: '1rem',
                  color: 'primary.main',
                  lineHeight: 1.2,
                }}
              >
                Pagë e diskutueshme
              </Typography>
            </Stack>
          )}

          <CardDescription text={listing.description} />

          <SpecRow specs={specs} />

          {listing.cityName ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary', minWidth: 0 }}>
              <MapPinIcon size={14} weight="regular" />
              <Typography
                variant="caption"
                noWrap
                sx={{
                  color: 'text.secondary',
                  fontWeight: 500,
                  minWidth: 0,
                  flex: 1,
                }}
              >
                {listing.cityName}
              </Typography>
            </Stack>
          ) : null}

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.disabled">
              {listingCardRelativeDate(listing)}
            </Typography>
            <Stack direction="row" spacing={0.45} sx={{ alignItems: 'center', color: 'text.disabled' }}>
              <EyeIcon size={14} weight="regular" />
              <Typography variant="caption" color="text.disabled">
                {new Intl.NumberFormat('en-GB').format(viewCount)}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </CardShell>
    </ListingCardLink>
  );
}

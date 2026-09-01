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
import {
  JOB_LISTING_COVER_ASPECT_RATIO,
  jobListingCoverImageUrl,
  jobListingUsesMockupCover,
} from '@/lib/job-listing-cover';
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

const JobListingFallback = dynamic(
  () => import('@/components/jobs/job-listing-fallback').then((m) => ({ default: m.JobListingFallback })),
  { loading: () => null }
);

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
      sx={(theme) => ({
        width: '100%',
        boxSizing: 'border-box',
        alignItems: 'center',
        justifyContent: 'center',
        px: 1.1,
        py: 0.65,
        color: '#fff',
        bgcolor: 'rgba(0,0,0,0.48)',
        borderTop: '1px solid rgba(255,255,255,0.14)',
        backdropFilter: 'blur(8px)',
        ...theme.applyStyles('dark', {
          bgcolor: 'rgba(0,0,0,0.72)',
          borderTop: '1px solid rgba(255,255,255,0.16)',
        }),
      })}
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
  locationInPriceRow = false,
}: {
  listing: PublicJobListing;
  sellerRating?: ListingCardRatingSummary | null;
  imagePriority?: boolean;
  /** `'cover'` is the square crop used on the jobs browse page. Homepage stays `'default'`. */
  variant?: 'default' | 'cover' | 'compact';
  locationInPriceRow?: boolean;
}) {
  const viewCount = listing.viewCount ?? 0;
  const industryLabel = findOptionLabel(JOB_INDUSTRY_OPTIONS, listing.industry);
  const jobTypeLabel = findOptionLabel(JOB_TYPE_OPTIONS, listing.jobType);
  const workLocationLabel = findOptionLabel(WORK_LOCATION_OPTIONS, listing.workLocation);
  const experienceLabel = findOptionLabel(JOB_EXPERIENCE_OPTIONS, listing.experience);
  const educationLabel = findOptionLabel(JOB_EDUCATION_OPTIONS, listing.education);
  const locationLabel = [listing.zoneName, listing.cityName].filter(Boolean).join(', ');
  const salaryLabel =
    listing.salary != null ? `${formatPrice(listing.salary, listing.currency)} / muaj` : 'Pagë e diskutueshme';
  const expiresAt = listing.expiresAt ?? getJobListingExpiresAt(listing.createdAt).toISOString();
  const cardRating = resolveListingCardRating(null, sellerRating);
  const usesMockupCover = jobListingUsesMockupCover(listing);
  const displayImageUrl = jobListingCoverImageUrl(listing);

  const WorkLocationIcon = workLocationIcon(listing.workLocation);

  const specs: Spec[] = [
    ...(listing.jobType ? [{ Icon: ClockIcon, label: jobTypeLabel, title: 'Tipi i punës' }] : []),
    ...(listing.workLocation ? [{ Icon: WorkLocationIcon, label: workLocationLabel, title: 'Vendi i punës' }] : []),
    ...(listing.experience ? [{ Icon: StarIcon, label: experienceLabel, title: 'Eksperienca' }] : []),
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
      <CardShell
        compact={variant === 'compact'}
        premium={Boolean(listing.isPremium)}
        okazion={Boolean(listing.isOkazion)}
      >
        <CardMedia
          listingKind="job"
          listingId={listing.id}
          imageUrl={displayImageUrl}
          FallbackIcon={BriefcaseIcon}
          fallbackContent={
            usesMockupCover ? (
              <JobListingFallback
                title={listing.title}
                industry={listing.industry}
                cityName={listing.cityName}
                zoneName={listing.zoneName}
                mapsUrl={listing.mapsUrl}
                locationAddress={listing.locationAddress}
                locationLat={listing.locationLat}
                locationLng={listing.locationLng}
              />
            ) : undefined
          }
          alt={listing.title}
          height={displayImageUrl ? { xs: 185, md: 200 } : undefined}
          aspectRatio={
            displayImageUrl
              ? variant === 'cover' || variant === 'compact'
                ? '1 / 1'
                : undefined
              : JOB_LISTING_COVER_ASPECT_RATIO
          }
          compact={variant === 'compact'}
          topLeftBadge={jobTypeLabel || undefined}
          shareCount={listing.shareCount}
          saveCount={listing.saveCount}
          saved={listing.saved}
          premium={Boolean(listing.isPremium)}
          okazion={Boolean(listing.isOkazion)}
          okazionUntil={listing.okazionUntil}
          sellerVerified={Boolean(listing.sellerVerified)}
          bottomOverlay={
            variant !== 'compact' && !listing.isOkazion ? <JobExpiryAnnouncementBar expiresAt={expiresAt} /> : undefined
          }
          priority={imagePriority}
          sharePayload={{
            title: listing.title,
            category: industryLabel,
            priceLabel: salaryLabel,
            badge: jobTypeLabel,
            imageUrl: displayImageUrl,
            location: locationLabel || undefined,
            specs: [
              ...(listing.jobType ? [{ icon: 'clock' as const, label: jobTypeLabel }] : []),
              ...(listing.workLocation
                ? [
                    {
                      icon:
                        listing.workLocation === 'remote'
                          ? ('house' as const)
                          : listing.workLocation === 'hybrid'
                            ? ('path' as const)
                            : ('buildings' as const),
                      label: workLocationLabel,
                    },
                  ]
                : []),
              ...(listing.experience ? [{ icon: 'star' as const, label: experienceLabel }] : []),
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
        {variant === 'compact' ? (
          <Stack
            className="listing-card-body"
            spacing={{ xs: 0.25, sm: 0.4 }}
            sx={{ pt: { xs: 0.65, sm: 0.8 }, px: { xs: 0.25, sm: 0.4 }, pb: { xs: 0.8, sm: 1 } }}
          >
            <ListingTitleWithVerified
              title={listing.title}
              maxLines={1}
              verified={false}
              typographySx={{
                fontSize: { xs: '0.76rem', sm: '0.82rem' },
                fontWeight: 650,
                lineHeight: 1.25,
              }}
            />
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              {listing.salary != null ? (
                <ListingPrice
                  price={listing.salary}
                  currency={listing.currency}
                  isPremium={listing.isPremium}
                  isOkazion={listing.isOkazion}
                  fontSize="0.9rem"
                  fontWeight={800}
                  suffix={
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 0.35, fontWeight: 500 }}
                    >
                      / muaj
                    </Typography>
                  }
                />
              ) : (
                <Typography sx={{ color: 'primary.main', fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.2 }}>
                  Pagë e diskutueshme
                </Typography>
              )}
              <Stack
                direction="row"
                spacing={0.35}
                sx={{ alignItems: 'center', color: 'text.disabled', flexShrink: 0 }}
              >
                <EyeIcon size={12} weight="regular" />
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                  {new Intl.NumberFormat('en-GB').format(viewCount)}
                </Typography>
              </Stack>
            </Stack>
            {locationLabel ? (
              <Stack direction="row" spacing={0.35} sx={{ alignItems: 'center', color: 'text.disabled', minWidth: 0 }}>
                <MapPinIcon size={12} weight="regular" color="var(--mui-palette-primary-main)" />
                <Typography variant="caption" noWrap color="text.disabled" sx={{ fontSize: '0.68rem' }}>
                  {locationLabel}
                </Typography>
              </Stack>
            ) : null}
          </Stack>
        ) : (
          <Stack className="listing-card-body" spacing={1} sx={{ p: 1.75 }}>
            <ListingTitleWithVerified title={listing.title} maxLines={1} verified={false} />
            {cardRating ? (
              <ListingCardRating ratingAverage={cardRating.ratingAverage} reviewCount={cardRating.reviewCount} />
            ) : null}
            {locationInPriceRow ? (
              <Stack
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}
              >
                {listing.salary != null ? (
                  <ListingPrice
                    price={listing.salary}
                    currency={listing.currency}
                    isPremium={listing.isPremium}
                    isOkazion={listing.isOkazion}
                    fontSize="1rem"
                    suffix={
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 0.5, fontWeight: 500 }}
                      >
                        / muaj
                      </Typography>
                    }
                    sx={{ minWidth: 0, flex: '1 1 auto' }}
                  />
                ) : (
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: '1rem',
                      color: 'primary.main',
                      lineHeight: 1.2,
                      minWidth: 0,
                      flex: '1 1 auto',
                    }}
                  >
                    Pagë e diskutueshme
                  </Typography>
                )}
                {locationLabel ? (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                      alignItems: 'center',
                      color: 'text.secondary',
                      minWidth: 0,
                      maxWidth: '50%',
                      flexShrink: 1,
                    }}
                  >
                    <MapPinIcon size={14} weight="regular" color="var(--mui-palette-primary-main)" />
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{ color: 'text.secondary', fontWeight: 500, minWidth: 0, textAlign: 'right' }}
                    >
                      {locationLabel}
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>
            ) : listing.salary != null ? (
              <ListingPrice
                price={listing.salary}
                currency={listing.currency}
                isPremium={listing.isPremium}
                isOkazion={listing.isOkazion}
                fontSize="1rem"
                suffix={
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    sx={{ ml: 0.5, fontWeight: 500 }}
                  >
                    / muaj
                  </Typography>
                }
              />
            ) : (
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
            )}

            <CardDescription text={listing.description} />

            <SpecRow specs={specs} />

            {!locationInPriceRow && locationLabel ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary', minWidth: 0 }}>
                <MapPinIcon size={14} weight="regular" color="var(--mui-palette-primary-main)" />
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ color: 'text.secondary', fontWeight: 500, minWidth: 0, flex: 1 }}
                >
                  {locationLabel}
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
        )}
      </CardShell>
    </ListingCardLink>
  );
}

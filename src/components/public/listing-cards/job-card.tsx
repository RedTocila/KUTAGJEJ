'use client';

import * as React from 'react';
import Link from 'next/link';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import HubOutlined from '@mui/icons-material/HubOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import StarOutlineOutlined from '@mui/icons-material/StarOutlineOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Work from '@mui/icons-material/Work';
import { Box, Stack, Typography } from '@mui/material';

import {
  JOB_EDUCATION_OPTIONS,
  JOB_EXPERIENCE_OPTIONS,
  JOB_INDUSTRY_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import type { PublicJobListing } from '@/lib/public-listings-client';
import { listingJobPublicHref } from '@/paths';

import { CardDescription } from './card-description';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import { findOptionLabel, formatPrice, pseudoRandomMetric, relativeAlbanianDate } from './format-helpers';
import { ListingCardFeaturedImageFooter } from './listing-card-featured-overlay';
import { SpecRow, type Spec } from './spec-row';

const iconSm = { fontSize: 14 } as const;
const iconFeatured = { fontSize: 17 } as const;

function WorkLocationMuiIcon({ value, size }: { value: string; size: 'sm' | 'feat' }) {
  const sx = size === 'feat' ? iconFeatured : iconSm;
  if (value === 'remote') return <HomeOutlined sx={sx} />;
  if (value === 'hybrid') return <HubOutlined sx={sx} />;
  return <BusinessOutlined sx={sx} />;
}

export function JobCard({
  listing,
  variant = 'default',
}: {
  listing: PublicJobListing;
  variant?: 'default' | 'featured';
}) {
  const viewCount = React.useMemo(
    () => pseudoRandomMetric(`job:${listing.id}:${listing.createdAt}`, 120, 9800),
    [listing.id, listing.createdAt],
  );
  const industryLabel = findOptionLabel(JOB_INDUSTRY_OPTIONS, listing.industry);
  const jobTypeLabel = findOptionLabel(JOB_TYPE_OPTIONS, listing.jobType);
  const workLocationLabel = findOptionLabel(WORK_LOCATION_OPTIONS, listing.workLocation);
  const experienceLabel = findOptionLabel(JOB_EXPERIENCE_OPTIONS, listing.experience);
  const educationLabel = findOptionLabel(JOB_EDUCATION_OPTIONS, listing.education);
  const salary =
    listing.salary != null ? `${formatPrice(listing.salary, listing.currency)} / muaj` : 'Pagë e diskutueshme';

  const locationLine = listing.cityName ? `${listing.cityName}, Shqipëri` : null;

  const specs: Spec[] =
    variant === 'featured'
      ? [
          { icon: <ScheduleOutlined sx={iconFeatured} />, label: jobTypeLabel, title: 'Tipi i punës' },
          {
            icon: <WorkLocationMuiIcon value={listing.workLocation} size="feat" />,
            label: workLocationLabel,
            title: 'Vendi i punës',
          },
          { icon: <StarOutlineOutlined sx={iconFeatured} />, label: experienceLabel, title: 'Eksperienca' },
        ]
      : [
          { icon: <ScheduleOutlined sx={iconSm} />, label: jobTypeLabel, title: 'Tipi i punës' },
          {
            icon: <WorkLocationMuiIcon value={listing.workLocation} size="sm" />,
            label: workLocationLabel,
            title: 'Vendi i punës',
          },
          { icon: <StarOutlineOutlined sx={iconSm} />, label: experienceLabel, title: 'Eksperienca' },
          ...(listing.education && listing.education !== 'no-requirement'
            ? [{ icon: <SchoolOutlined sx={iconSm} />, label: educationLabel, title: 'Arsimi' }]
            : []),
        ];

  const mediaHeight = variant === 'featured' ? 268 : 170;
  const shellSx = variant === 'featured' ? { borderRadius: 3, '&:hover': { transform: 'translateY(-4px)' } } : undefined;

  const featuredImageFooter =
    variant === 'featured' ? (
      <ListingCardFeaturedImageFooter
        listingId={listing.id}
        priceLine={
          listing.salary != null ? (
            <>
              {formatPrice(listing.salary, listing.currency)}
              <Typography
                component="span"
                sx={{ ml: 0.5, fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)' }}
              >
                / muaj
              </Typography>
            </>
          ) : (
            'Pagë e diskutueshme'
          )
        }
        title={listing.title}
        locationLine={locationLine}
      />
    ) : null;

  return (
    <Link
      href={listingJobPublicHref(listing)}
      prefetch={false}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
      aria-labelledby={`listing-card-title-${listing.id}`}
    >
      <CardShell sx={shellSx}>
        <CardMedia
          imageUrl={listing.imageUrl}
          FallbackIcon={Work}
          alt={listing.title}
          topLeftBadge={jobTypeLabel}
          height={mediaHeight}
          bottomOverlay={featuredImageFooter}
          visualVariant={variant === 'featured' ? 'featured' : 'default'}
        />
        <Stack
          className="listing-card-body"
          spacing={variant === 'featured' ? 0 : 1}
          sx={{
            p: { xs: 1.75, sm: 2 },
            pt: variant === 'featured' ? 1.75 : undefined,
          }}
        >
          {variant === 'featured' ? null : (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
            >
              {industryLabel}
            </Typography>
          )}
          {variant === 'featured' ? null : (
            <Typography
              component="h3"
              id={`listing-card-title-${listing.id}`}
              sx={{
                fontWeight: 700,
                fontSize: '0.95rem',
                lineHeight: 1.4,
                color: 'text.primary',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {listing.title}
            </Typography>
          )}
          {variant === 'default' ? (
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: 'primary.main', lineHeight: 1.2 }}>{salary}</Typography>
          ) : null}
          {variant === 'default' ? <CardDescription text={listing.description} /> : null}
          {variant === 'default' ? <Box sx={{ flex: 1 }} /> : null}
          <SpecRow specs={specs} variant={variant === 'featured' ? 'featured' : 'default'} />
          {variant === 'default' && listing.cityName ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
              <LocationOnOutlined sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {listing.cityName}
              </Typography>
            </Stack>
          ) : null}
          {variant === 'default' ? (
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.disabled">
                {relativeAlbanianDate(listing.createdAt)}
              </Typography>
              <Stack direction="row" spacing={0.45} sx={{ alignItems: 'center', color: 'text.disabled' }}>
                <VisibilityOutlined sx={{ fontSize: 14 }} />
                <Typography variant="caption" color="text.disabled">
                  {new Intl.NumberFormat('en-GB').format(viewCount)}
                </Typography>
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      </CardShell>
    </Link>
  );
}

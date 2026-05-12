'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Stack, Typography } from '@mui/material';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Clock as ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { GraduationCap as GraduationCapIcon } from '@phosphor-icons/react/dist/ssr/GraduationCap';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Path as PathIcon } from '@phosphor-icons/react/dist/ssr/Path';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';

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
import { SpecRow, type Spec } from './spec-row';

function workLocationIcon(value: string) {
  if (value === 'remote') return HouseIcon;
  if (value === 'hybrid') return PathIcon;
  return BuildingsIcon;
}

export function JobCard({ listing }: { listing: PublicJobListing }) {
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
    <Link href={listingJobPublicHref(listing)} prefetch={false} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
      <CardShell>
      <CardMedia
        imageUrl={listing.imageUrl}
        FallbackIcon={BriefcaseIcon}
        alt={listing.title}
        topLeftBadge={jobTypeLabel}
      />
      <Stack className="listing-card-body" spacing={1} sx={{ p: { xs: 1.75, sm: 2 } }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
        >
          {industryLabel}
        </Typography>
        <Typography
          component="h3"
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
        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: 'primary.main', lineHeight: 1.2 }}>
          {salary}
        </Typography>

        <CardDescription text={listing.description} />

        <Box sx={{ flex: 1 }} />

        <SpecRow specs={specs} />

        {listing.cityName ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
            <MapPinIcon size={14} weight="regular" />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {listing.cityName}
            </Typography>
          </Stack>
        ) : null}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.disabled">
            {relativeAlbanianDate(listing.createdAt)}
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
    </Link>
  );
}

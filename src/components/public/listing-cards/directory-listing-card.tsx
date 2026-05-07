'use client';

import * as React from 'react';
import { Box, Link as MuiLink, Stack, Typography } from '@mui/material';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { CalendarCheck as CalendarCheckIcon } from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Clock as ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Tag as TagIcon } from '@phosphor-icons/react/dist/ssr/Tag';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';

import { MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import type { PublicDirectoryListing } from '@/lib/public-listings-client';

import { CardDescription } from './card-description';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import { findOptionLabel, formatPrice, pseudoRandomMetric, relativeAlbanianDate } from './format-helpers';
import { SpecRow, type Spec } from './spec-row';

function conditionIcon(condition: string | null) {
  if (condition === 'i-ri' || condition === 'si-i-ri') return SparkleIcon;
  return CheckCircleIcon;
}

/** Biznese = venues (eat, drink, reserve) — not rent/sale listings. */
function BusinessVenueCardBody({ listing }: { listing: PublicDirectoryListing }) {
  const viewCount = React.useMemo(
    () => pseudoRandomMetric(`dir:${listing.id}:${listing.createdAt}`, 80, 4200),
    [listing.id, listing.createdAt],
  );

  const specs: Spec[] = [{ Icon: TagIcon, label: listing.categoryLabel, title: 'Lloji' }];

  const topBadge = listing.reservationsEnabled ? 'Rezervim' : undefined;

  return (
    <CardShell>
      <CardMedia
        imageUrl={listing.imageUrl}
        FallbackIcon={StorefrontIcon}
        alt={listing.title}
        topLeftBadge={topBadge}
      />
      <Stack className="listing-card-body" spacing={1} sx={{ p: { xs: 1.75, sm: 2 } }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
        >
          {listing.categoryLabel}
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

        {listing.servicesHighlight ? (
          <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600, lineHeight: 1.35 }}>
            {listing.servicesHighlight}
          </Typography>
        ) : null}

        {listing.openingHours ? (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start', color: 'text.secondary' }}>
            <Box sx={{ pt: 0.15, flexShrink: 0 }}>
              <ClockIcon size={16} weight="regular" />
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.45,
              }}
            >
              {listing.openingHours}
            </Typography>
          </Stack>
        ) : null}

        {listing.reservationsEnabled ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <CalendarCheckIcon size={14} weight="bold" />
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main' }}>
              {listing.reservationUrl ? 'Rezervim online ose telefon' : 'Rezervim me telefon'}
            </Typography>
          </Stack>
        ) : null}

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
        {listing.reservationUrl ? (
          <MuiLink
            href={listing.reservationUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="caption"
            sx={{ fontWeight: 600 }}
          >
            Hap faqen e rezervimit →
          </MuiLink>
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
  );
}

/** Profesionistë — hourly/project rates (keeps price line). */
function ProfessionalListingCardBody({ listing }: { listing: PublicDirectoryListing }) {
  const viewCount = React.useMemo(
    () => pseudoRandomMetric(`dir:${listing.id}:${listing.createdAt}`, 80, 4200),
    [listing.id, listing.createdAt],
  );
  const conditionLabel = listing.condition ? findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, listing.condition) : null;

  const specs: Spec[] = [
    { Icon: TagIcon, label: listing.categoryLabel, title: 'Kategoria' },
    ...(conditionLabel ? [{ Icon: conditionIcon(listing.condition), label: conditionLabel, title: 'Gjendja' }] : []),
  ];

  return (
    <CardShell>
      <CardMedia
        imageUrl={listing.imageUrl}
        FallbackIcon={BriefcaseIcon}
        alt={listing.title}
        topLeftBadge={conditionLabel ?? undefined}
      />
      <Stack className="listing-card-body" spacing={1} sx={{ p: { xs: 1.75, sm: 2 } }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
        >
          {listing.categoryLabel}
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
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'primary.main', lineHeight: 1.2 }}>
          {formatPrice(listing.price, listing.currency)}
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
  );
}

export function DirectoryListingCard({ listing }: { listing: PublicDirectoryListing }) {
  if (listing.kind === 'businesses') {
    return <BusinessVenueCardBody listing={listing} />;
  }
  return <ProfessionalListingCardBody listing={listing} />;
}

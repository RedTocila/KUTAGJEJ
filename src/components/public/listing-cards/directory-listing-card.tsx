'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Stack, Typography } from '@mui/material';
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
import { listingBusinessPublicHref, listingProfessionalPublicHref } from '@/paths';

import { BusinessPromoBanner } from './business-promo-banner';
import { CardDescription } from './card-description';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import {
  findOptionLabel,
  formatBusinessOpeningHoursForCard,
  formatPrice,
  pseudoRandomMetric,
  relativeAlbanianDate,
} from './format-helpers';
import { SpecRow, type Spec } from './spec-row';

function conditionIcon(condition: string | null) {
  if (condition === 'i-ri' || condition === 'si-i-ri') return SparkleIcon;
  return CheckCircleIcon;
}

/** Biznese = venues (eat, drink, reserve) — minimal card layout. */
function BusinessVenueCardBody({ listing }: { listing: PublicDirectoryListing }) {
  const viewCount = React.useMemo(
    () => pseudoRandomMetric(`dir:${listing.id}:${listing.createdAt}`, 80, 4200),
    [listing.id, listing.createdAt],
  );

  const openingHoursLabel = listing.openingHours
    ? formatBusinessOpeningHoursForCard(listing.openingHours)
    : null;

  const topBadge = listing.reservationsEnabled ? 'Rezervim' : undefined;

  return (
    <Link
      href={listingBusinessPublicHref(listing)}
      prefetch={false}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      <CardShell>
        <CardMedia
          imageUrl={listing.imageUrl}
          FallbackIcon={StorefrontIcon}
          alt={listing.title}
          topLeftBadge={topBadge}
          bottomOverlay={
            listing.reservationsEnabled ? (
              <BusinessPromoBanner servicesHighlight={listing.servicesHighlight} variant="card" overlay />
            ) : undefined
          }
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

          {openingHoursLabel ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
              <ClockIcon size={14} weight="regular" color="var(--mui-palette-text-disabled)" />
              <Typography
                variant="caption"
                noWrap
                sx={{
                  color: 'text.disabled',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                  flex: 1,
                }}
              >
                {openingHoursLabel}
              </Typography>
            </Stack>
          ) : null}

          {listing.reservationsEnabled ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <CalendarCheckIcon size={14} weight="bold" />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main' }}>
                {listing.reservationUrl ? 'Rezervim online' : 'Rezervim me telefon'}
              </Typography>
            </Stack>
          ) : null}

          <Box sx={{ flex: 1 }} />

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
    <Link
      href={listingProfessionalPublicHref(listing)}
      prefetch={false}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
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
    </Link>
  );
}

export function DirectoryListingCard({ listing }: { listing: PublicDirectoryListing }) {
  if (listing.kind === 'businesses') {
    return <BusinessVenueCardBody listing={listing} />;
  }
  return <ProfessionalListingCardBody listing={listing} />;
}

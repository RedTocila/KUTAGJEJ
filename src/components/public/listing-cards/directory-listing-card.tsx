'use client';

import * as React from 'react';
import Link from 'next/link';
import AccessTimeOutlined from '@mui/icons-material/AccessTimeOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import LabelOutlined from '@mui/icons-material/LabelOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Work from '@mui/icons-material/Work';
import { Box, Stack, Typography } from '@mui/material';

import { MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import type { PublicDirectoryListing } from '@/lib/public-listings-client';
import { listingBusinessPublicHref, listingProfessionalPublicHref } from '@/paths';

import { CardDescription } from './card-description';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import { findOptionLabel, formatPrice, pseudoRandomMetric, relativeAlbanianDate } from './format-helpers';
import { SpecRow, type Spec } from './spec-row';

const iconSm = { fontSize: 14 } as const;

function conditionIconNode(condition: string | null) {
  if (condition === 'i-ri' || condition === 'si-i-ri') return <AutoAwesomeOutlined sx={iconSm} />;
  return <CheckCircleOutlineOutlined sx={iconSm} />;
}

function BusinessVenueCardBody({ listing }: { listing: PublicDirectoryListing }) {
  const viewCount = React.useMemo(
    () => pseudoRandomMetric(`dir:${listing.id}:${listing.createdAt}`, 80, 4200),
    [listing.id, listing.createdAt],
  );

  const specs: Spec[] = [{ icon: <LabelOutlined sx={iconSm} />, label: listing.categoryLabel, title: 'Lloji' }];

  const topBadge = listing.reservationsEnabled ? 'Rezervim' : undefined;

  return (
    <Link
      href={listingBusinessPublicHref(listing)}
      prefetch={false}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      <CardShell>
        <CardMedia imageUrl={listing.imageUrl} FallbackIcon={StorefrontOutlined} alt={listing.title} topLeftBadge={topBadge} />
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
              <Box sx={{ pt: 0.15, flexShrink: 0, display: 'flex' }}>
                <AccessTimeOutlined sx={{ fontSize: 16 }} />
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
              <EventAvailableOutlined sx={{ fontSize: 14 }} />
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
              <LocationOnOutlined sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {listing.cityName}
              </Typography>
            </Stack>
          ) : null}
          {listing.reservationUrl ? (
            <Typography
              component="span"
              role="link"
              tabIndex={0}
              variant="caption"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(listing.reservationUrl!, '_blank', 'noopener,noreferrer');
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                e.stopPropagation();
                window.open(listing.reservationUrl!, '_blank', 'noopener,noreferrer');
              }}
              sx={{ fontWeight: 600, cursor: 'pointer', color: 'primary.main', textDecoration: 'underline' }}
            >
              Hap faqen e rezervimit →
            </Typography>
          ) : null}
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
        </Stack>
      </CardShell>
    </Link>
  );
}

function ProfessionalListingCardBody({ listing }: { listing: PublicDirectoryListing }) {
  const viewCount = React.useMemo(
    () => pseudoRandomMetric(`dir:${listing.id}:${listing.createdAt}`, 80, 4200),
    [listing.id, listing.createdAt],
  );
  const conditionLabel = listing.condition ? findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, listing.condition) : null;

  const specs: Spec[] = [
    { icon: <LabelOutlined sx={iconSm} />, label: listing.categoryLabel, title: 'Kategoria' },
    ...(conditionLabel ? [{ icon: conditionIconNode(listing.condition), label: conditionLabel, title: 'Gjendja' }] : []),
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
          FallbackIcon={Work}
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
              <LocationOnOutlined sx={{ fontSize: 14 }} />
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
              <VisibilityOutlined sx={{ fontSize: 14 }} />
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

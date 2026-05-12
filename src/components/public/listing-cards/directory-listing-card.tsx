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
import { ListingCardFeaturedImageFooter } from './listing-card-featured-overlay';
import { SpecRow, type Spec } from './spec-row';

const iconSm = { fontSize: 14 } as const;
const iconFeatured = { fontSize: 17 } as const;

function conditionIconNode(condition: string | null, size: 'sm' | 'feat') {
  const sx = size === 'feat' ? iconFeatured : iconSm;
  if (condition === 'i-ri' || condition === 'si-i-ri') return <AutoAwesomeOutlined sx={sx} />;
  return <CheckCircleOutlineOutlined sx={sx} />;
}

function BusinessVenueCardBody({ listing, variant = 'default' }: { listing: PublicDirectoryListing; variant?: 'default' | 'featured' }) {
  const viewCount = React.useMemo(
    () => pseudoRandomMetric(`dir:${listing.id}:${listing.createdAt}`, 80, 4200),
    [listing.id, listing.createdAt],
  );

  const locationLine = listing.cityName ? `${listing.cityName}, Shqipëri` : null;

  const hoursTeaser =
    listing.openingHours && listing.openingHours.trim()
      ? listing.openingHours.trim().split('\n')[0].slice(0, 48) + (listing.openingHours.length > 48 ? '…' : '')
      : null;

  const specs: Spec[] =
    variant === 'featured'
      ? [
          { icon: <LabelOutlined sx={iconFeatured} />, label: listing.categoryLabel, title: 'Lloji' },
          {
            icon: <AccessTimeOutlined sx={iconFeatured} />,
            label: hoursTeaser ?? 'Orari — kontakto',
            title: 'Orari',
          },
          {
            icon: <StorefrontOutlined sx={iconFeatured} />,
            label: listing.reservationsEnabled ? 'Rezervim' : 'Biznes',
            title: 'Lloji',
          },
        ]
      : [{ icon: <LabelOutlined sx={iconSm} />, label: listing.categoryLabel, title: 'Lloji' }];

  const topBadge = listing.reservationsEnabled ? 'Rezervim' : undefined;

  const mediaHeight = variant === 'featured' ? 268 : 170;
  const shellSx = variant === 'featured' ? { borderRadius: 3, '&:hover': { transform: 'translateY(-4px)' } } : undefined;

  const bizPriceLine =
    listing.price != null
      ? formatPrice(listing.price, listing.currency)
      : listing.servicesHighlight?.trim() || 'Ofertë biznesi';

  const featuredImageFooter =
    variant === 'featured' ? (
      <ListingCardFeaturedImageFooter
        listingId={listing.id}
        priceLine={bizPriceLine}
        title={listing.title}
        locationLine={locationLine}
      />
    ) : null;

  return (
    <Link
      href={listingBusinessPublicHref(listing)}
      prefetch={false}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
      aria-labelledby={`listing-card-title-${listing.id}`}
    >
      <CardShell sx={shellSx}>
        <CardMedia
          imageUrl={listing.imageUrl}
          FallbackIcon={StorefrontOutlined}
          alt={listing.title}
          topLeftBadge={topBadge}
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
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
              >
                {listing.categoryLabel}
              </Typography>
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
            </>
          )}

          {variant === 'default' && listing.servicesHighlight ? (
            <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600, lineHeight: 1.35 }}>
              {listing.servicesHighlight}
            </Typography>
          ) : null}

          {variant === 'default' && listing.openingHours ? (
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

          {variant === 'default' && listing.reservationsEnabled ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <EventAvailableOutlined sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main' }}>
                {listing.reservationUrl ? 'Rezervim online ose telefon' : 'Rezervim me telefon'}
              </Typography>
            </Stack>
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
          {variant === 'default' && listing.reservationUrl ? (
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

function ProfessionalListingCardBody({ listing, variant = 'default' }: { listing: PublicDirectoryListing; variant?: 'default' | 'featured' }) {
  const viewCount = React.useMemo(
    () => pseudoRandomMetric(`dir:${listing.id}:${listing.createdAt}`, 80, 4200),
    [listing.id, listing.createdAt],
  );
  const conditionLabel = listing.condition ? findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, listing.condition) : null;

  const locationLine = listing.cityName ? `${listing.cityName}, Shqipëri` : null;

  const specs: Spec[] =
    variant === 'featured'
      ? [
          { icon: <LabelOutlined sx={iconFeatured} />, label: listing.categoryLabel, title: 'Kategoria' },
          ...(conditionLabel
            ? [{ icon: conditionIconNode(listing.condition, 'feat'), label: conditionLabel, title: 'Gjendja' }]
            : []),
          { icon: <Work sx={iconFeatured} />, label: 'Profesionist', title: 'Lloji' },
        ]
      : [
          { icon: <LabelOutlined sx={iconSm} />, label: listing.categoryLabel, title: 'Kategoria' },
          ...(conditionLabel ? [{ icon: conditionIconNode(listing.condition, 'sm'), label: conditionLabel, title: 'Gjendja' }] : []),
        ];

  const mediaHeight = variant === 'featured' ? 268 : 170;
  const shellSx = variant === 'featured' ? { borderRadius: 3, '&:hover': { transform: 'translateY(-4px)' } } : undefined;

  const priceFeatured =
    listing.price != null ? formatPrice(listing.price, listing.currency) : 'Çmim me marrëveshje';

  const featuredImageFooter =
    variant === 'featured' ? (
      <ListingCardFeaturedImageFooter
        listingId={listing.id}
        priceLine={priceFeatured}
        title={listing.title}
        locationLine={locationLine}
      />
    ) : null;

  return (
    <Link
      href={listingProfessionalPublicHref(listing)}
      prefetch={false}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
      aria-labelledby={`listing-card-title-${listing.id}`}
    >
      <CardShell sx={shellSx}>
        <CardMedia
          imageUrl={listing.imageUrl}
          FallbackIcon={Work}
          alt={listing.title}
          topLeftBadge={conditionLabel ?? undefined}
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
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
              >
                {listing.categoryLabel}
              </Typography>
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
              <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'primary.main', lineHeight: 1.2 }}>
                {formatPrice(listing.price, listing.currency)}
              </Typography>
            </>
          )}

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

export function DirectoryListingCard({
  listing,
  variant = 'default',
}: {
  listing: PublicDirectoryListing;
  variant?: 'default' | 'featured';
}) {
  if (listing.kind === 'businesses') {
    return <BusinessVenueCardBody listing={listing} variant={variant} />;
  }
  return <ProfessionalListingCardBody listing={listing} variant={variant} />;
}

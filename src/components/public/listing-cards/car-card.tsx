'use client';

import * as React from 'react';
import Link from 'next/link';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import ColorLensOutlined from '@mui/icons-material/ColorLensOutlined';
import DirectionsCarOutlined from '@mui/icons-material/DirectionsCarOutlined';
import LocalGasStationOutlined from '@mui/icons-material/LocalGasStationOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import SpeedOutlined from '@mui/icons-material/SpeedOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import { Box, Stack, Typography } from '@mui/material';

import { CAR_COLOUR_OPTIONS, FUEL_TYPE_OPTIONS, TRANSMISSION_OPTIONS } from '@/lib/car-constants';
import type { PublicCarListing } from '@/lib/public-listings-client';
import { listingCarPublicHref } from '@/paths';

import { CardDescription } from './card-description';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import { findOptionLabel, formatKilometers, formatPrice, pseudoRandomMetric, relativeAlbanianDate } from './format-helpers';
import { ListingCardFeaturedImageFooter } from './listing-card-featured-overlay';
import { SpecRow, type Spec } from './spec-row';

const iconSm = { fontSize: 14 } as const;
const iconFeatured = { fontSize: 17 } as const;

export function CarCard({
  listing,
  variant = 'default',
}: {
  listing: PublicCarListing;
  variant?: 'default' | 'featured';
}) {
  const title = [listing.make, listing.model, listing.variant].filter(Boolean).join(' ');
  const viewCount = React.useMemo(
    () => pseudoRandomMetric(`car:${listing.id}:${listing.createdAt}`, 120, 9800),
    [listing.id, listing.createdAt],
  );
  const fuelLabel = findOptionLabel(FUEL_TYPE_OPTIONS, listing.fuelType);
  const transmissionLabel = findOptionLabel(TRANSMISSION_OPTIONS, listing.transmission);
  const colourLabel = findOptionLabel(CAR_COLOUR_OPTIONS, listing.color);

  const locationLine = listing.cityName ? `${listing.cityName}, Shqipëri` : null;

  const specs: Spec[] =
    variant === 'featured'
      ? [
          { icon: <CalendarTodayOutlined sx={iconFeatured} />, label: String(listing.year), title: 'Viti' },
          { icon: <SpeedOutlined sx={iconFeatured} />, label: formatKilometers(listing.kilometers), title: 'Kilometrazh' },
          { icon: <LocalGasStationOutlined sx={iconFeatured} />, label: fuelLabel, title: 'Karburant' },
        ]
      : [
          { icon: <CalendarTodayOutlined sx={iconSm} />, label: String(listing.year), title: 'Viti' },
          { icon: <SpeedOutlined sx={iconSm} />, label: formatKilometers(listing.kilometers), title: 'Kilometrazh' },
          { icon: <LocalGasStationOutlined sx={iconSm} />, label: fuelLabel, title: 'Karburant' },
          { icon: <SettingsOutlined sx={iconSm} />, label: transmissionLabel, title: 'Transmision' },
          ...(listing.color ? [{ icon: <ColorLensOutlined sx={iconSm} />, label: colourLabel, title: 'Ngjyra' }] : []),
        ];

  const mediaHeight = variant === 'featured' ? 268 : 170;
  const shellSx = variant === 'featured' ? { borderRadius: 3, '&:hover': { transform: 'translateY(-4px)' } } : undefined;

  const featuredImageFooter =
    variant === 'featured' ? (
      <ListingCardFeaturedImageFooter
        listingId={listing.id}
        priceLine={formatPrice(listing.price, listing.currency)}
        title={title}
        locationLine={locationLine}
      />
    ) : null;

  return (
    <Link
      href={listingCarPublicHref(listing)}
      prefetch={false}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
      aria-labelledby={`listing-card-title-${listing.id}`}
    >
      <CardShell sx={shellSx}>
        <CardMedia
          imageUrl={listing.imageUrl}
          FallbackIcon={DirectionsCarOutlined}
          alt={title}
          topLeftBadge={`${listing.year}`}
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
              {listing.make}
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
              {title}
            </Typography>
          )}
          {variant === 'default' ? (
            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'primary.main', lineHeight: 1.2 }}>
              {formatPrice(listing.price, listing.currency)}
            </Typography>
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

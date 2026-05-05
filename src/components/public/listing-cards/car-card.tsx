'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Calendar as CalendarIcon } from '@phosphor-icons/react/dist/ssr/Calendar';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { GasPump as GasPumpIcon } from '@phosphor-icons/react/dist/ssr/GasPump';
import { Gauge as GaugeIcon } from '@phosphor-icons/react/dist/ssr/Gauge';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { PaintBucket as PaintBucketIcon } from '@phosphor-icons/react/dist/ssr/PaintBucket';

import { CAR_COLOUR_OPTIONS, FUEL_TYPE_OPTIONS, TRANSMISSION_OPTIONS } from '@/lib/car-constants';
import type { PublicCarListing } from '@/lib/public-listings-client';

import { CardDescription } from './card-description';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import { findOptionLabel, formatKilometers, formatPrice, relativeAlbanianDate } from './format-helpers';
import { SpecRow, type Spec } from './spec-row';

export function CarCard({ listing }: { listing: PublicCarListing }) {
  const title = [listing.make, listing.model, listing.variant].filter(Boolean).join(' ');
  const fuelLabel = findOptionLabel(FUEL_TYPE_OPTIONS, listing.fuelType);
  const transmissionLabel = findOptionLabel(TRANSMISSION_OPTIONS, listing.transmission);
  const colourLabel = findOptionLabel(CAR_COLOUR_OPTIONS, listing.color);

  const specs: Spec[] = [
    { Icon: CalendarIcon, label: String(listing.year), title: 'Viti' },
    { Icon: GaugeIcon, label: formatKilometers(listing.kilometers), title: 'Kilometrazh' },
    { Icon: GasPumpIcon, label: fuelLabel, title: 'Karburant' },
    { Icon: GearSixIcon, label: transmissionLabel, title: 'Transmision' },
    ...(listing.color ? [{ Icon: PaintBucketIcon, label: colourLabel, title: 'Ngjyra' }] : []),
  ];

  return (
    <CardShell>
      <CardMedia imageUrl={listing.imageUrl} FallbackIcon={CarIcon} alt={title} topLeftBadge={`${listing.year}`} />
      <Stack className="listing-card-body" spacing={1} sx={{ p: { xs: 1.75, sm: 2 } }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
        >
          {listing.make}
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
          {title}
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
        <Typography variant="caption" color="text.disabled">
          {relativeAlbanianDate(listing.createdAt)}
        </Typography>
      </Stack>
    </CardShell>
  );
}

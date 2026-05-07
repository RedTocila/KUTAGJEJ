'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Bathtub as BathtubIcon } from '@phosphor-icons/react/dist/ssr/Bathtub';
import { Bed as BedIcon } from '@phosphor-icons/react/dist/ssr/Bed';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Calendar as CalendarIcon } from '@phosphor-icons/react/dist/ssr/Calendar';
import { Couch as CouchIcon } from '@phosphor-icons/react/dist/ssr/Couch';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { Ruler as RulerIcon } from '@phosphor-icons/react/dist/ssr/Ruler';
import { Stairs as StairsIcon } from '@phosphor-icons/react/dist/ssr/Stairs';

import type { PublicRealEstateListing } from '@/lib/public-listings-client';
import { propertyCategoryLabel } from '@/lib/real-estate-constants';

import { CardDescription } from './card-description';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import { formatPrice, pseudoRandomMetric, relativeAlbanianDate } from './format-helpers';
import { SpecRow, type Spec } from './spec-row';

const FURNISHING_LABEL: Record<string, string> = {
  furnished: 'I mobiluar',
  unfurnished: 'Pa mobilim',
  'partially-furnished': 'Pjesërisht i mobiluar',
  'kitchen-only': 'Vetëm kuzhinë',
};

export function RealEstateCard({ listing }: { listing: PublicRealEstateListing }) {
  const location = [listing.zoneName, listing.cityName].filter(Boolean).join(', ');
  const transactionLabel = listing.transactionType === 'rent' ? 'Me qira' : 'Në shitje';
  const viewCount = React.useMemo(
    () => pseudoRandomMetric(`re:${listing.id}:${listing.createdAt}`, 120, 9800),
    [listing.id, listing.createdAt],
  );

  const specs: Spec[] = [
    ...(listing.bedrooms != null ? [{ Icon: BedIcon, label: `${listing.bedrooms}`, title: 'Dhoma gjumi' }] : []),
    ...(listing.bathrooms != null ? [{ Icon: BathtubIcon, label: `${listing.bathrooms}`, title: 'Banjo' }] : []),
    { Icon: RulerIcon, label: `${listing.surfaceM2} m²`, title: 'Sipërfaqe' },
    ...(listing.floor != null ? [{ Icon: StairsIcon, label: `Kati ${listing.floor}`, title: 'Kati' }] : []),
    ...(listing.yearBuilt != null
      ? [{ Icon: CalendarIcon, label: String(listing.yearBuilt), title: 'Viti i ndërtimit' }]
      : []),
    ...(listing.furnishing
      ? [{ Icon: CouchIcon, label: FURNISHING_LABEL[listing.furnishing] ?? listing.furnishing, title: 'Mobilim' }]
      : []),
  ];

  return (
    <CardShell>
      <CardMedia
        imageUrl={listing.imageUrl}
        FallbackIcon={listing.propertyCategory === 'villa' ? HouseIcon : BuildingsIcon}
        alt={listing.title}
        topLeftBadge={transactionLabel}
      />
      <Stack className="listing-card-body" spacing={1} sx={{ p: { xs: 1.75, sm: 2 } }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
        >
          {propertyCategoryLabel(listing.propertyCategory)}
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
          {listing.transactionType === 'rent' ? (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 500 }}>
              / muaj
            </Typography>
          ) : null}
        </Typography>

        <CardDescription text={listing.description} />

        <Box sx={{ flex: 1 }} />

        <SpecRow specs={specs} />

        {location ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
            <MapPinIcon size={14} weight="regular" />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {location}
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

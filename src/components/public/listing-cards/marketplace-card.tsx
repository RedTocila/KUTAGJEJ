'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { ShoppingBag as ShoppingBagIcon } from '@phosphor-icons/react/dist/ssr/ShoppingBag';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Tag as TagIcon } from '@phosphor-icons/react/dist/ssr/Tag';

import { MARKETPLACE_CATEGORY_OPTIONS, MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import type { PublicMarketplaceListing } from '@/lib/public-listings-client';

import { CardDescription } from './card-description';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import { findOptionLabel, formatPrice, relativeAlbanianDate } from './format-helpers';
import { SpecRow, type Spec } from './spec-row';

function conditionIcon(condition: string | null) {
  if (condition === 'i-ri' || condition === 'si-i-ri') return SparkleIcon;
  return CheckCircleIcon;
}

export function MarketplaceCard({ listing }: { listing: PublicMarketplaceListing }) {
  const categoryLabel = findOptionLabel(MARKETPLACE_CATEGORY_OPTIONS, listing.category);
  const conditionLabel = listing.condition ? findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, listing.condition) : null;

  const specs: Spec[] = [
    { Icon: TagIcon, label: categoryLabel, title: 'Kategoria' },
    ...(conditionLabel ? [{ Icon: conditionIcon(listing.condition), label: conditionLabel, title: 'Gjendja' }] : []),
  ];

  return (
    <CardShell>
      <CardMedia
        imageUrl={listing.imageUrl}
        FallbackIcon={ShoppingBagIcon}
        alt={listing.title}
        topLeftBadge={conditionLabel ?? undefined}
      />
      <Stack className="listing-card-body" spacing={1} sx={{ p: { xs: 1.75, sm: 2 } }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
        >
          {categoryLabel}
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
        <Typography variant="caption" color="text.disabled">
          {relativeAlbanianDate(listing.createdAt)}
        </Typography>
      </Stack>
    </CardShell>
  );
}
